// express_index.js (带空间配额功能 - 完整版)

const express = require('express');
const cors = require('cors');
const mysql = require('mysql2/promise');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcrypt');
const saltRounds = 10;
const jwt = require('jsonwebtoken');
const secretKey = 'Wangpangongfang123';
const { nanoid } = require('nanoid');

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors());
app.use('/avatars', express.static(path.join(__dirname, 'avatars')));

const pool = mysql.createPool({
  host: 'localhost',
  user: 'root',
  password: 'Wangpangongfang123',
  database: '网盘',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  charset: 'utf8mb4'
});

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = path.join(__dirname, 'uploads');
    if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir);
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + '-' + file.originalname);
  }
});
// --- Multer 配置 ---
// 1. 用于常规文件上传
const fileStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = path.join(__dirname, 'uploads');
    if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir);
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) { 
    const safeOriginalName = Buffer.from(file.originalname, 'latin1').toString('utf8');
    cb(null, Date.now() + '-' + safeOriginalName);
  }
});
const upload = multer({ storage: fileStorage, limits: { fileSize: 60 * 1024 * 1024 }});
// 2. 新增：专门用于头像上传的 Multer 配置
const avatarStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    const avatarDir = path.join(__dirname, 'avatars');
    if (!fs.existsSync(avatarDir)) fs.mkdirSync(avatarDir);
    cb(null, avatarDir);
  },
  filename: function (req, file, cb) {
    const ext = path.extname(file.originalname);
    // 使用 时间戳-用户ID.扩展名 的格式，防止浏览器缓存问题
    cb(null, `${req.user.id}-${Date.now()}${ext}`);
  }
});
const avatarUpload = multer({
  storage: avatarStorage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 头像限制 5MB
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('只允许上传图片文件!'), false);
    }
  }
});
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (token == null) return res.status(401).json({ message: '认证失败: 缺少Token' });
  jwt.verify(token, secretKey, (err, user) => {
    if (err) return res.status(403).json({ message: '认证失败: 无效的Token' });
    req.user = user;
    next();
  });
};
const validateShare = async (req, res, next) => {
    const { shareId } = req.params;
    const { password } = req.body; // 密码通过 POST 请求体传递

    try {
        const [shares] = await pool.execute('SELECT * FROM shares WHERE share_id = ?', [shareId]);
        if (shares.length === 0) { return res.status(404).json({ success: false, message: '分享链接不存在' }); }
        
        const share = shares[0];
        // 校验有效期
        if (share.expire_at && new Date(share.expire_at) < new Date()) {
            return res.status(403).json({ success: false, message: '分享链接已过期' });
        }
        
        // 校验密码
        if (share.password) {
            if (!password) {
                return res.status(200).json({ success: false, message: '请输入访问密码', requiresPassword: true });
            }
            if (password !== share.password) {
                return res.status(401).json({ success: false, message: '访问密码错误' });
            }
        }
        
        // 将验证通过的分享信息附加到请求上，供后续使用
        req.share = share;
        next();
    } catch (error) {
        res.status(500).json({ success: false, message: '校验分享失败' });
    }
};

// ==========================================================
// ★★★          功能接口 START              ★★★
// ==========================================================

// 获取空间使用情况接口
app.get('/quota', authenticateToken, async (req, res) => {
  const userId = req.user.id;
  try {
    const [userRows] = await pool.execute(
      'SELECT total_quota, used_quota FROM user_info WHERE id = ?',
      [userId]
    );
    if (userRows.length === 0) {
      return res.status(404).json({ message: '用户不存在' });
    }
    const { total_quota, used_quota } = userRows[0];

    const [typeRows] = await pool.execute(
      `SELECT 
        SUM(CASE WHEN name LIKE '%.mp4' OR name LIKE '%.avi' OR name LIKE '%.mov' OR name LIKE '%.wmv' OR name LIKE '%.flv' OR name LIKE '%.mkv' THEN size ELSE 0 END) AS video,
        SUM(CASE WHEN name LIKE '%.mp3' OR name LIKE '%.wav' OR name LIKE '%.ogg' OR name LIKE '%.flac' OR name LIKE '%.aac' THEN size ELSE 0 END) AS audio,
        SUM(CASE WHEN name LIKE '%.doc' OR name LIKE '%.docx' OR name LIKE '%.pdf' OR name LIKE '%.txt' OR name LIKE '%.xls' OR name LIKE '%.xlsx' OR name LIKE '%.ppt' OR name LIKE '%.pptx' OR name LIKE '%.md' THEN size ELSE 0 END) AS document,
        SUM(CASE WHEN name LIKE '%.zip' OR name LIKE '%.rar' OR name LIKE '%.7z' OR name LIKE '%.tar' OR name LIKE '%.gz' THEN size ELSE 0 END) AS archive,
        SUM(CASE WHEN name LIKE '%.jpg' OR name LIKE '%.jpeg' OR name LIKE '%.png' OR name LIKE '%.gif' OR name LIKE '%.bmp' OR name LIKE '%.svg' THEN size ELSE 0 END) AS image,
        SUM(CASE WHEN 
            NOT (name LIKE '%.mp4' OR name LIKE '%.avi' OR name LIKE '%.mov' OR name LIKE '%.wmv' OR name LIKE '%.flv' OR name LIKE '%.mkv') AND
            NOT (name LIKE '%.mp3' OR name LIKE '%.wav' OR name LIKE '%.ogg' OR name LIKE '%.flac' OR name LIKE '%.aac') AND
            NOT (name LIKE '%.doc' OR name LIKE '%.docx' OR name LIKE '%.pdf' OR name LIKE '%.txt' OR name LIKE '%.xls' OR name LIKE '%.xlsx' OR name LIKE '%.ppt' OR name LIKE '%.pptx' OR name LIKE '%.md') AND
            NOT (name LIKE '%.zip' OR name LIKE '%.rar' OR name LIKE '%.7z' OR name LIKE '%.tar' OR name LIKE '%.gz') AND
            NOT (name LIKE '%.jpg' OR name LIKE '%.jpeg' OR name LIKE '%.png' OR name LIKE '%.gif' OR name LIKE '%.bmp' OR name LIKE '%.svg')
        THEN size ELSE 0 END) AS other
      FROM files WHERE userId = ? AND type = 'file'`,
      [userId]
    );
    
    res.json({
      success: true,
      totalQuota: total_quota,
      usedQuota: used_quota,
      usageDetails: {
        video: Number(typeRows[0].video) || 0,
        audio: Number(typeRows[0].audio) || 0,
        document: Number(typeRows[0].document) || 0,
        archive: Number(typeRows[0].archive) || 0,
        image: Number(typeRows[0].image) || 0,
        other: Number(typeRows[0].other) || 0,
      }
    });

  } catch (error) {
    console.error('获取空间配额失败:', error);
    res.status(500).json({ success: false, message: '获取空间配额失败' });
  }
});

// 文件上传接口
app.post('/upload', authenticateToken, upload.single('file'), async (req, res) => {
  const userId = req.user.id;
  const fileSize = req.file.size;
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();
    
    // 使用 FOR UPDATE 加锁，确保数据一致性
    const [userRows] = await connection.execute('SELECT total_quota, used_quota FROM user_info WHERE id = ? FOR UPDATE', [userId]);
    const { total_quota, used_quota } = userRows[0];
    
    if (used_quota + fileSize > total_quota) {
      await connection.rollback();
      const filePath = path.join(__dirname, 'uploads', req.file.filename);
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
      return res.status(413).json({ success: false, message: '网盘空间不足' }); // 使用 413 状态码更语义化
    }

    const originalname_in_utf8 = Buffer.from(req.file.originalname, 'latin1').toString('utf8');
    const { filename } = req.file;
    const parentId = req.body.parentId || 0;
    
    const [result] = await connection.execute(
      'INSERT INTO files (name, filename, size, upload_time, userId, parentId, type) VALUES (?, ?, ?, NOW(), ?, ?, "file")',
      [originalname_in_utf8, filename, fileSize, userId, parentId]
    );

    await connection.execute('UPDATE user_info SET used_quota = used_quota + ? WHERE id = ?', [fileSize, userId]);
    
    await connection.commit();

    const file = { id: result.insertId, name: originalname_in_utf8, filename, size: fileSize, uploadTime: new Date().toISOString(), userId, parentId, type: 'file' };
    res.json({ success: true, file });

  } catch (error) {
    await connection.rollback();
    // 如果文件已上传，也需要删除
    const filePath = path.join(__dirname, 'uploads', req.file.filename);
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    console.error('文件上传失败:', error);
    res.status(500).json({ success: false, message: '文件上传失败' });
  } finally {
    connection.release();
  }
});

// 删除接口
app.delete('/files/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;
  const userId = req.user.id;
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();
    
    // 找出所有需要被软删除的子孙ID
    const itemsToSoftDelete = [];
    const queue = [Number(id)];
    
    const [rootItem] = await connection.execute('SELECT * FROM files WHERE id = ? and userId = ? AND is_deleted = 0', [id, userId]);
    if (rootItem.length === 0) {
        await connection.rollback();
        return res.status(404).json({ message: '项目不存在或已在回收站中' });
    }
    itemsToSoftDelete.push(rootItem[0]);

    if (rootItem[0].type === 'folder') {
        let current_queue = [rootItem[0].id];
        while (current_queue.length > 0) {
            const placeholders = current_queue.map(() => '?').join(',');
            const [children] = await connection.execute(`SELECT * FROM files WHERE parentId IN (${placeholders}) AND userId = ? AND is_deleted = 0`, [...current_queue, userId]);
            if (children.length > 0) {
                itemsToSoftDelete.push(...children);
                current_queue = children.filter(c => c.type === 'folder').map(c => c.id);
            } else {
                current_queue = [];
            }
        }
    }
    
    const idsToSoftDelete = itemsToSoftDelete.map(item => item.id);
    
    if (idsToSoftDelete.length > 0) {
        const placeholders = idsToSoftDelete.map(() => '?').join(',');
        await connection.execute(
          `UPDATE files SET is_deleted = 1, deleted_at = NOW() WHERE id IN (${placeholders}) AND userId = ?`,
          [...idsToSoftDelete, userId]
        );
    }
    
    await connection.commit();
    res.json({ message: '已移至回收站' });

  } catch (error) {
    await connection.rollback();
    console.error('移至回收站失败:', error);
    res.status(500).json({ message: '移至回收站失败' });
  } finally {
    connection.release();
  }
});


// 创建文件夹接口
app.post('/folders', authenticateToken, async (req, res) => {
  const { name, parentId = 0 } = req.body;
  const userId = req.user.id;
  if (!name) {
    return res.status(400).json({ success: false, message: '文件夹名称不能为空' });
  }
  try {
    const [existing] = await pool.execute(
        'SELECT id FROM files WHERE name = ? AND parentId = ? AND userId = ? AND type = "folder"',
        [name, parentId, userId]
    );
    if (existing.length > 0) {
        return res.status(409).json({ success: false, message: '该位置已存在同名文件夹' });
    }

    const [result] = await pool.execute(
      'INSERT INTO files (name, filename, type, parentId, userId, upload_time, size) VALUES (?, NULL, "folder", ?, ?, NOW(), 0)',
      [name, parentId, userId]
    );
    res.json({ success: true, message: '文件夹创建成功', id: result.insertId });
  } catch (error) {
    console.error('创建文件夹失败:', error);
    res.status(500).json({ success: false, message: '创建文件夹失败' });
  }
});

// 获取文件和文件夹列表接口
app.get('/files', authenticateToken, async (req, res) => {
  const userId = req.user.id;
  const parentId = req.query.parentId || 0;
  const inRecycleBin = req.query.recycle === 'true'; // 新增参数

  try {
    let sql;
    // 如果是在回收站内浏览，我们不需要检查 is_deleted 状态
    if (inRecycleBin) {
        sql = 'SELECT id, name, type, size, upload_time AS uploadTime, parentId, is_deleted, deleted_at AS deletedAt FROM files WHERE userId = ? AND parentId = ? ORDER BY type DESC, name ASC';
    } else {
        sql = 'SELECT id, name, type, size, upload_time AS uploadTime, parentId FROM files WHERE userId = ? AND parentId = ? AND is_deleted = 0 ORDER BY type DESC, name ASC';
    }
    const [rows] = await pool.execute(sql, [userId, parentId]);
    res.json(rows);
  } catch (error) {
    console.error('获取文件列表失败:', error);
    res.status(500).json({ message: '获取文件列表失败' });
  }
});
// ★★★ 新增：获取回收站文件列表接口 ★★★
app.get('/recycle-bin', authenticateToken, async (req, res) => {
    const userId = req.user.id;
    try {
        // 查询逻辑: 找出所有 is_deleted=1 的项, 
        // 并且它的 parentId=0, 或者它的父项的 is_deleted=0
        const [rows] = await pool.execute(
            `SELECT t1.*, t1.deleted_at as deletedAt FROM files t1
             LEFT JOIN files t2 ON t1.parentId = t2.id
             WHERE t1.userId = ? AND t1.is_deleted = 1 
             AND (t1.parentId = 0 OR (t2.id IS NOT NULL AND t2.is_deleted = 0))
             ORDER BY t1.deleted_at DESC`,
            [userId]
        );
        res.json(rows);
    } catch (error) {
        console.error('获取回收站列表失败:', error);
        res.status(500).json({ message: '获取回收站列表失败' });
    }
});
// ★★★ 新增：还原文件/文件夹接口 ★★★
app.post('/recycle-bin/restore', authenticateToken, async (req, res) => {
    const { itemIds } = req.body;
    const userId = req.user.id;
    const connection = await pool.getConnection();

    if (!itemIds || itemIds.length === 0) { return res.status(400).json({ message: '未选择任何项目' }); }
    
    try {
        await connection.beginTransaction();

        const itemsToRestore = [];
        const queue = [...itemIds];

        // 找出所有子孙后代
        while(queue.length > 0) {
            const placeholders = queue.map(() => '?').join(',');
            const [foundItems] = await connection.execute(`SELECT * FROM files WHERE id IN (${placeholders}) AND userId = ?`, [...queue, userId]);
            if (foundItems.length === 0) break;
            
            itemsToRestore.push(...foundItems);
            
            const folderIds = foundItems.filter(i => i.type === 'folder').map(i => i.id);
            if(folderIds.length > 0) {
                const folderPlaceholders = folderIds.map(() => '?').join(',');
                const [children] = await connection.execute(`SELECT id, type FROM files WHERE parentId IN (${folderPlaceholders}) AND userId = ?`, [...folderIds, userId]);
                queue.push(...children.map(c => c.id));
            }
            // 从queue中移除已经处理过的
            queue.splice(0, foundItems.length);
        }
        
        // 找出所有需要还原的ID
        const idsToRestore = [...new Set(itemsToRestore.map(i => i.id))];

        if (idsToRestore.length > 0) {
            // 检查父文件夹是否在回收站，如果是，则不允许还原
            const [parents] = await connection.execute(`
                SELECT DISTINCT t2.* FROM files t1 
                JOIN files t2 ON t1.parentId = t2.id 
                WHERE t1.id IN (?) AND t1.parentId != 0 AND t2.is_deleted = 1
            `, [idsToRestore]);

            if (parents.length > 0) {
                await connection.rollback();
                return res.status(400).json({ message: '无法还原，因为其所在的父文件夹仍在回收站中。请先还原父文件夹。' });
            }

            const restorePlaceholders = idsToRestore.map(() => '?').join(',');
            await connection.execute(
                `UPDATE files SET is_deleted = 0, deleted_at = NULL WHERE id IN (${restorePlaceholders}) AND userId = ?`,
                [...idsToRestore, userId]
            );
        }

        await connection.commit();
        res.json({ message: '还原成功' });
    } catch (error) {
        await connection.rollback();
        console.error('还原失败:', error);
        res.status(500).json({ message: '还原失败' });
    } finally {
        connection.release();
    }
});

// ★★★ 新增：彻底删除接口 (硬删除) ★★★
app.delete('/recycle-bin/permanent-delete', authenticateToken, async (req, res) => {
  const { itemIds } = req.body;
  const userId = req.user.id;
  const connection = await pool.getConnection();

  if (!itemIds || itemIds.length === 0) {
    return res.status(400).json({ message: '未选择任何项目' });
  }

  try {
    await connection.beginTransaction();

    const placeholders = itemIds.map(() => '?').join(',');
    const [itemsToDelete] = await connection.execute(
        `SELECT * FROM files WHERE id IN (${placeholders}) AND userId = ? AND is_deleted = 1 FOR UPDATE`, 
        [...itemIds, userId]
    );
    
    let totalSizeDeleted = 0;
    for (const item of itemsToDelete) {
      if (item.type === 'file' && item.filename) {
        totalSizeDeleted += Number(item.size);
        const filePath = path.join(__dirname, 'uploads', item.filename);
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      }
    }

    if (itemsToDelete.length > 0) {
        const idsToDelete = itemsToDelete.map(i => i.id);
        const deletePlaceholders = idsToDelete.map(() => '?').join(',');
        await connection.execute(`DELETE FROM files WHERE id IN (${deletePlaceholders}) AND userId = ?`, [...idsToDelete, userId]);
    }
    
    if (totalSizeDeleted > 0) {
      await connection.execute('UPDATE user_info SET used_quota = GREATEST(0, used_quota - ?) WHERE id = ?', [totalSizeDeleted, userId]);
    }
    
    await connection.commit();
    res.json({ message: '彻底删除成功' });

  } catch (error) {
    await connection.rollback();
    console.error('彻底删除失败:', error);
    res.status(500).json({ message: '彻底删除失败' });
  } finally {
    connection.release();
  }
});


// 5. ★★★ 升级：获取文件列表接口 -> 增加一个参数以支持浏览回收站内的文件夹 ★★★
app.get('/files', authenticateToken, async (req, res) => {
  const userId = req.user.id;
  const parentId = req.query.parentId || 0;
  const inRecycleBin = req.query.recycle === 'true'; // 新增参数

  try {
    let sql;
    // 如果是在回收站内浏览，我们不需要检查 is_deleted 状态
    if (inRecycleBin) {
        sql = 'SELECT id, name, type, size, upload_time AS uploadTime, parentId, is_deleted, deleted_at AS deletedAt FROM files WHERE userId = ? AND parentId = ? ORDER BY type DESC, name ASC';
    } else {
        sql = 'SELECT id, name, type, size, upload_time AS uploadTime, parentId FROM files WHERE userId = ? AND parentId = ? AND is_deleted = 0 ORDER BY type DESC, name ASC';
    }
    const [rows] = await pool.execute(sql, [userId, parentId]);
    res.json(rows);
  } catch (error) {
    console.error('获取文件列表失败:', error);
    res.status(500).json({ message: '获取文件列表失败' });
  }
});


// 面包屑导航数据接口
app.get('/breadcrumbs', authenticateToken, async (req, res) => {
  const userId = req.user.id;
  let currentId = req.query.id || 0;
  if (currentId == 0) {
    return res.json([{ id: 0, name: '全部文件' }]);
  }
  try {
    const breadcrumbs = [];
    while (currentId != 0) {
      const [rows] = await pool.execute('SELECT id, name, parentId FROM files WHERE id = ? AND userId = ?', [currentId, userId]);
      if (rows.length === 0) break;
      const current = rows[0];
      breadcrumbs.unshift({ id: current.id, name: current.name });
      currentId = current.parentId;
    }
    breadcrumbs.unshift({ id: 0, name: '全部文件' });
    res.json(breadcrumbs);
  } catch (error) {
    console.error('获取面包屑失败:', error);
    res.status(500).json({ message: '获取面包屑失败' });
  }
});

// 重命名文件/文件夹接口
app.patch('/files/:id/rename', authenticateToken, async (req, res) => {
    const { name } = req.body;
    const { id } = req.params;
    const userId = req.user.id;
    if (!name) { return res.status(400).json({ success: false, message: '名称不能为空' }); }
    try {
        const [itemToRename] = await pool.execute('SELECT parentId, type FROM files WHERE id = ? AND userId = ?', [id, userId]);
        if(itemToRename.length === 0) { return res.status(404).json({ success: false, message: '目标不存在' }); }
        const { parentId, type } = itemToRename[0];
        const [existing] = await pool.execute(
            'SELECT id FROM files WHERE name = ? AND parentId = ? AND userId = ? AND type = ? AND id != ?',
            [name, parentId, userId, type, id]
        );
        if(existing.length > 0) { return res.status(409).json({ success: false, message: '该位置已存在同名文件或文件夹' }); }
        await pool.execute('UPDATE files SET name = ? WHERE id = ? AND userId = ?', [name, id, userId]);
        res.json({ success: true, message: '重命名成功' });
    } catch (error) {
        console.error('重命名失败:', error);
        res.status(500).json({ success: false, message: '重命名失败' });
    }
});

// 全局搜索接口
app.get('/search', authenticateToken, async (req, res) => {
  const { keyword } = req.query;
  const userId = req.user.id;
  if (!keyword) { return res.status(400).json({ success: false, message: '搜索关键词不能为空' }); }
  try {
    const searchTerm = `%${keyword}%`;
    const [results] = await pool.execute(
      'SELECT id, name, type, size, parentId, upload_time AS uploadTime FROM files WHERE userId = ? AND name LIKE ?',
      [userId, searchTerm]
    );
    const resultsWithPath = await Promise.all(results.map(async (item) => {
      const breadcrumbs = [];
      let currentId = item.parentId;
      while (currentId != 0) {
        const [rows] = await pool.execute('SELECT id, name, parentId FROM files WHERE id = ? AND userId = ?', [currentId, userId]);
        if (rows.length === 0) break;
        const current = rows[0];
        breadcrumbs.unshift({ id: current.id, name: current.name });
        currentId = current.parentId;
      }
      breadcrumbs.unshift({ id: 0, name: '全部文件' });
      return { ...item, path: breadcrumbs };
    }));
    res.json(resultsWithPath);
  } catch (error) {
    console.error('全局搜索失败:', error);
    res.status(500).json({ success: false, message: '搜索失败' });
  }
});

// 批量移动文件/文件夹接口
app.post('/files/move', authenticateToken, async (req, res) => {
  const { itemIds, targetParentId } = req.body;
  const userId = req.user.id;
  if (!itemIds || itemIds.length === 0 || targetParentId === undefined) { return res.status(400).json({ success: false, message: '缺少必要的参数' }); }
  try {
    if (targetParentId != 0) {
      const [targetFolder] = await pool.execute('SELECT id FROM files WHERE id = ? AND userId = ? AND type = "folder"', [targetParentId, userId]);
      if (targetFolder.length === 0) { return res.status(404).json({ success: false, message: '目标文件夹不存在' }); }
    }
    for (const itemId of itemIds) {
      if (itemId == targetParentId) { return res.status(400).json({ success: false, message: '不能将文件夹移动到自身' }); }
    }
    const placeholders = itemIds.map(() => '?').join(',');
    const sql = `UPDATE files SET parentId = ? WHERE id IN (${placeholders}) AND userId = ?`;
    const params = [targetParentId, ...itemIds, userId];
    const [result] = await pool.execute(sql, params);
    res.json({ success: true, message: '移动成功', affectedRows: result.affectedRows });
  } catch (error) {
    console.error('批量移动失败:', error);
    res.status(500).json({ success: false, message: '批量移动失败' });
  }
});

// 批量打包到新文件夹接口
app.post('/files/package', authenticateToken, async (req, res) => {
  const { itemIds, newFolderName, parentId } = req.body;
  const userId = req.user.id;
  const connection = await pool.getConnection();
  if (!itemIds || itemIds.length === 0 || !newFolderName || parentId === undefined) { return res.status(400).json({ success: false, message: '缺少必要的参数' }); }
  try {
    await connection.beginTransaction();
    const [folderResult] = await connection.execute(
      'INSERT INTO files (name, filename, type, parentId, userId, upload_time, size) VALUES (?, NULL, "folder", ?, ?, NOW(), 0)',
      [newFolderName, parentId, userId]
    );
    const newFolderId = folderResult.insertId;
    const placeholders = itemIds.map(() => '?').join(',');
    const sql = `UPDATE files SET parentId = ? WHERE id IN (${placeholders}) AND userId = ?`;
    const params = [newFolderId, ...itemIds, userId];
    await connection.execute(sql, params);
    await connection.commit();
    res.json({ success: true, message: '打包成功', newFolderId: newFolderId });
  } catch (error) {
    await connection.rollback();
    console.error('打包到新文件夹失败:', error);
    res.status(500).json({ success: false, message: '打包失败，请检查文件夹名称是否重复' });
  } finally {
    connection.release();
  }
});



// ==========================================================
// ★★★           功能接口 END               ★★★
// ==========================================================
// ★★★ 新增：头像上传接口 ★★★
app.post('/upload-avatar', authenticateToken, avatarUpload.single('avatar'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ success: false, message: '没有提供头像文件' });
  }
  
  const userId = req.user.id;
  // 后端生成的头像文件访问路径 (例如 /avatars/1-1688...png)
  const avatarUrl = `/avatars/${req.file.filename}`;
  
  try {
    // 更新前，先查询旧的头像路径，以便后续删除
    const [userRows] = await pool.execute('SELECT avatar FROM user_info WHERE id = ?', [userId]);
    const oldAvatarPath = userRows[0]?.avatar;

    // 更新数据库中的头像路径
    await pool.execute('UPDATE user_info SET avatar = ? WHERE id = ?', [avatarUrl, userId]);

    // 如果旧头像存在，则删除它
    if (oldAvatarPath) {
      // 从 URL 路径还原为服务器上的完整文件路径
      const oldAvatarFullPath = path.join(__dirname, oldAvatarPath);
      if (fs.existsSync(oldAvatarFullPath)) {
        fs.unlinkSync(oldAvatarFullPath);
      }
    }

    res.json({ success: true, message: '头像上传成功', avatarUrl: avatarUrl });
  } catch (error) {
    console.error('头像上传失败:', error);
    res.status(500).json({ success: false, message: '头像上传失败' });
  }
});

// --- 用户认证与文件下载部分 (保持不变) ---
app.post('/login', async (req, res) => {
  const { email, password } = req.body;
  try {
    // 1. 只根据邮箱查询用户
    const [rows] = await pool.execute('SELECT id, name, password, avatar FROM user_info WHERE email = ?', [email]);
    
    // 2. 检查用户是否存在
    if (rows.length === 0) {
      // 如果邮箱不存在，返回 404 和明确的错误信息
      return res.status(404).json({ success: false, message: '该邮箱尚未注册' });
    }
    
    const user = rows[0];
    
    // 3. 独立地比较密码
    const match = await bcrypt.compare(password, user.password);
    
    if (match) {
      // 密码正确，登录成功
      const userPayload = { id: user.id, name: user.name };
      const token = jwt.sign(userPayload, secretKey, { expiresIn: '1h' });
      res.json({ 
        success: true, 
        message: '登录成功', 
        id: user.id, 
        name: user.name, 
        avatar: user.avatar,
        token: token 
      });
    } else {
      // 密码不匹配，返回 401 和明确的错误信息
      res.status(401).json({ success: false, message: '密码错误' });
    }
  } catch (error) {
    console.error('登录出错: ', error);
    res.status(500).json({ success: false, message: '登录失败，请重试' });
  }
});


app.post('/register', async (req, res) => {
  const { name, email, password } = req.body;
  try {
    const [checkRows] = await pool.execute('SELECT id FROM user_info WHERE email = ?', [email]);
    if (checkRows.length > 0) { return res.status(409).json({ success: false, message: '邮箱已被注册' }); }
    const hashedPassword = await bcrypt.hash(password, saltRounds);
    const [result] = await pool.execute(
      'INSERT INTO user_info (name, email, password) VALUES (?, ?, ?)',
      [name, email, hashedPassword]
    );
    res.json({ success: true, message: '注册成功', id: result.insertId });
  } catch (error) {
    console.error('注册出错:', error);
    res.status(500).json({ success: false, message: '注册失败' });
  }
});

app.get('/download/:id', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const [rows] = await pool.execute(
      'SELECT filename, name FROM files WHERE id = ? AND userId = ? AND type = "file"',
      [req.params.id, userId]
    );
    if (rows.length === 0) { return res.status(404).json({ message: '文件不存在或无权限访问' }); }
    const { filename, name } = rows[0];
    const filePath = path.join(__dirname, 'uploads', filename);
    res.setHeader('Content-Type', 'application/octet-stream');
    const encodedFileName = encodeURIComponent(name);
    res.setHeader('Content-Disposition', `attachment; filename="${encodedFileName}"; filename*=UTF-8''${encodedFileName}`);
    res.sendFile(filePath);
  } catch (error) {
    console.error('文件下载失败:', error);
    res.status(500).json({ message: '文件下载失败' });
  }
});

app.get('/', (req, res) => {
  res.send('欢迎访问后端服务器！');
});
// ★★★ 新增：修改用户名接口 ★★★
app.patch('/user/profile', authenticateToken, async (req, res) => {
  const { name } = req.body;
  const userId = req.user.id;

  if (!name || name.trim().length === 0) {
    return res.status(400).json({ success: false, message: '用户名不能为空' });
  }
  if (name.length > 50) {
    return res.status(400).json({ success: false, message: '用户名过长' });
  }

  try {
    await pool.execute('UPDATE user_info SET name = ? WHERE id = ?', [name.trim(), userId]);
    
    // 更新成功后，需要生成一个新的、包含新用户名的 token 返回给前端
    const userPayload = { id: userId, name: name.trim() };
    const newToken = jwt.sign(userPayload, secretKey, { expiresIn: '1h' });

    res.json({ 
      success: true, 
      message: '用户名更新成功',
      newName: name.trim(),
      newToken: newToken // 返回新 token
    });
  } catch (error) {
    console.error('更新用户名失败:', error);
    res.status(500).json({ success: false, message: '更新用户名失败' });
  }
});
// ==========================================================
// ★★★          文件分享功能接口 START              ★★★
// ==========================================================

// 1. 创建分享链接 (需要认证)
app.post('/shares', authenticateToken, async (req, res) => {
  const { itemId, type, password, expiresIn } = req.body;
  const userId = req.user.id;

  if (!itemId || !type) { return res.status(400).json({ success: false, message: '缺少必要参数' }); }

  try {
    const [items] = await pool.execute('SELECT id FROM files WHERE id = ? AND userId = ?', [itemId, userId]);
    if (items.length === 0) { return res.status(404).json({ success: false, message: '项目不存在或无权分享' }); }

    // 计算过期时间
    let expire_at = null;
    if (expiresIn > 0) {
      expire_at = new Date(Date.now() + expiresIn * 24 * 60 * 60 * 1000); // expiresIn 是天数
    }

    // 检查是否已存在完全相同的分享
    const [existing] = await pool.execute('SELECT share_id FROM shares WHERE file_id = ? AND user_id = ?', [itemId, userId]);
    if (existing.length > 0) {
        // 如果已存在，则更新它的密码和有效期
        await pool.execute(
            'UPDATE shares SET password = ?, expire_at = ? WHERE file_id = ? AND user_id = ?',
            [password || null, expire_at, itemId, userId]
        );
        return res.json({ success: true, shareId: existing[0].share_id });
    }
    
    const shareId = nanoid(10);
    await pool.execute(
      'INSERT INTO shares (share_id, file_id, user_id, type, password, expire_at) VALUES (?, ?, ?, ?, ?, ?)',
      [shareId, itemId, userId, type, password || null, expire_at]
    );

    res.json({ success: true, shareId: shareId });
  } catch (error) {
    console.error('创建/更新分享链接失败:', error);
    res.status(500).json({ success: false, message: '操作失败' });
  }
});

// 2. 获取分享信息接口 (现在需要密码验证)
app.post('/share/:shareId', validateShare, async (req, res) => {
  try {
    const { file_id, created_at } = req.share;
    const [rows] = await pool.execute(
      `SELECT f.id, f.name, f.size, f.type, ui.name AS sharerName 
       FROM files f JOIN user_info ui ON f.userId = ui.id 
       WHERE f.id = ?`, [file_id]
    );
    if (rows.length === 0) { return res.status(404).json({ success: false, message: '分享的项目已被删除' }); }
    
    let children = [];
    if(rows[0].type === 'folder') {
        // 如果是文件夹，额外获取其内部内容
        const [childNodes] = await pool.execute('SELECT id, name, type, size, upload_time as uploadTime FROM files WHERE parentId = ? AND is_deleted = 0 ORDER BY type DESC, name ASC', [file_id]);
        children = childNodes;
    }
    
    res.json({ 
        success: true, 
        shareInfo: {
            ...rows[0],
            shareTime: created_at,
            children: children,
            requiresPassword: !!req.share.password // 告诉前端这个分享是否需要密码
        } 
    });
  } catch (error) {
    console.error('获取分享信息失败:', error);
    res.status(500).json({ success: false, message: '获取分享信息失败' });
  }
});

// 3. 下载分享文件接口 (同样需要密码验证)
app.post('/share/:shareId/download', validateShare, async (req, res) => {
  const { shareId } = req.params;
  try {
    const [rows] = await pool.execute(
      `SELECT f.name, f.filename 
       FROM shares s 
       JOIN files f ON s.file_id = f.id 
       WHERE s.share_id = ?`,
      [shareId]
    );

    if (rows.length === 0) {
      return res.status(404).json({ message: '文件不存在或分享已失效' });
    }
    
    const { name, filename } = rows[0];
    const filePath = path.join(__dirname, 'uploads', filename);

    if (fs.existsSync(filePath)) {
      res.setHeader('Content-Type', 'application/octet-stream');
      const encodedFileName = encodeURIComponent(name);
      res.setHeader('Content-Disposition', `attachment; filename="${encodedFileName}"; filename*=UTF-8''${encodedFileName}`);
      res.sendFile(filePath);
    } else {
      res.status(404).json({ message: '服务器内部文件丢失' });
    }
  } catch (error) {
    console.error('下载分享文件失败:', error);
    res.status(500).json({ message: '下载文件失败' });
  }
});
// 4. 获取用户自己的所有分享
app.get('/my-shares', authenticateToken, async (req, res) => {
    const userId = req.user.id;
    try {
        const [rows] = await pool.execute(
            `SELECT s.share_id AS shareId, s.password, s.expire_at AS expireAt, s.created_at AS createdAt, f.name, f.type
             FROM shares s
             JOIN files f ON s.file_id = f.id
             WHERE s.user_id = ?`,
            [userId]
        );
        res.json({ success: true, shares: rows });
    } catch (error) {
        console.error('获取我的分享列表失败:', error);
        res.status(500).json({ success: false, message: '获取列表失败' });
    }
});
// 5. 取消分享
app.delete('/shares/:shareId', authenticateToken, async (req, res) => {
    const { shareId } = req.params;
    const userId = req.user.id;
    try {
        await pool.execute('DELETE FROM shares WHERE share_id = ? AND user_id = ?', [shareId, userId]);
        res.json({ success: true, message: '分享已取消' });
    } catch (error) {
        console.error('取消分享失败:', error);
        res.status(500).json({ success: false, message: '取消分享失败' });
    }
});
// ==========================================================
// ★★★           文件分享功能接口 END               ★★★
// ==========================================================

const port = 8082;
app.listen(port, '0.0.0.0', () => {
  console.log(`应用实例，可通过局域网 IP 访问，端口号为 ${port}`);
});