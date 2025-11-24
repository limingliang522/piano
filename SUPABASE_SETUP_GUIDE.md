# Supabase 用户系统配置指南

## 🎯 完全免费！5分钟完成配置

---

## 第一步：创建 Supabase 项目（2分钟）

### 1. 注册账号
1. 访问 https://supabase.com
2. 点击 **Start your project**
3. 使用 GitHub 账号登录（推荐）或邮箱注册

### 2. 创建项目
1. 点击 **New Project**
2. 填写项目信息：
   - **Name**: `piano-game`（随便起名）
   - **Database Password**: 自动生成（保存好）
   - **Region**: 选择 **Northeast Asia (Tokyo)** 或 **Southeast Asia (Singapore)**（离中国最近）
   - **Pricing Plan**: 选择 **Free**（完全免费）
3. 点击 **Create new project**
4. 等待 1-2 分钟，项目创建完成

---

## 第二步：获取 API 密钥（1分钟）

### 1. 进入项目设置
1. 点击左侧菜单的 **⚙️ Settings**
2. 点击 **API**

### 2. 复制密钥
你会看到两个重要信息：

**Project URL**（项目地址）
```
https://xxxxxxxxxxxxx.supabase.co
```

**anon public**（公开密钥）
```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh4eHh4eHh4eHh4eHh4eHh4eHh4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE2Nzg4ODg4ODgsImV4cCI6MTk5NDQ2NDg4OH0.xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

### 3. 配置到代码中
打开 `supabase-config.js` 文件，替换这两行：

```javascript
const SUPABASE_CONFIG = {
    url: 'YOUR_SUPABASE_URL', // 👈 替换成你的 Project URL
    anonKey: 'YOUR_SUPABASE_ANON_KEY' // 👈 替换成你的 anon public
};
```

**替换后示例：**
```javascript
const SUPABASE_CONFIG = {
    url: 'https://abcdefghijk.supabase.co',
    anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'
};
```

---

## 第三步：创建数据库表（2分钟）

### 1. 进入 SQL 编辑器
1. 点击左侧菜单的 **🗄️ SQL Editor**
2. 点击 **+ New query**

### 2. 复制粘贴以下 SQL 代码

```sql
-- 创建游戏成绩表
CREATE TABLE scores (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    midi_name TEXT NOT NULL,
    score INTEGER NOT NULL,
    accuracy NUMERIC(5,2) NOT NULL,
    combo INTEGER NOT NULL,
    notes_triggered INTEGER NOT NULL,
    total_notes INTEGER NOT NULL,
    speed_multiplier NUMERIC(3,2) DEFAULT 1.0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 创建索引（提升查询速度）
CREATE INDEX idx_scores_user_id ON scores(user_id);
CREATE INDEX idx_scores_midi_name ON scores(midi_name);
CREATE INDEX idx_scores_score ON scores(score DESC);
CREATE INDEX idx_scores_created_at ON scores(created_at DESC);

-- 启用行级安全（RLS）
ALTER TABLE scores ENABLE ROW LEVEL SECURITY;

-- 允许用户查看所有成绩（排行榜）
CREATE POLICY "Anyone can view scores"
    ON scores FOR SELECT
    USING (true);

-- 允许用户插入自己的成绩
CREATE POLICY "Users can insert own scores"
    ON scores FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- 允许用户删除自己的成绩
CREATE POLICY "Users can delete own scores"
    ON scores FOR DELETE
    USING (auth.uid() = user_id);

-- 创建用户统计视图（可选）
CREATE OR REPLACE VIEW user_stats AS
SELECT 
    user_id,
    COUNT(*) as total_games,
    SUM(score) as total_score,
    AVG(accuracy) as avg_accuracy,
    MAX(combo) as max_combo,
    MAX(score) as best_score,
    COUNT(DISTINCT midi_name) as unique_songs
FROM scores
GROUP BY user_id;
```

### 3. 运行 SQL
1. 点击右下角的 **Run** 按钮（或按 `Ctrl+Enter`）
2. 看到 **Success. No rows returned** 表示成功

---

## 第四步：配置邮箱认证（可选，1分钟）

### 默认配置（推荐）
Supabase 默认已启用邮箱认证，用户注册后会收到验证邮件。

### 自定义邮件模板（可选）
1. 点击 **⚙️ Settings** → **Authentication**
2. 点击 **Email Templates**
3. 可以自定义：
   - 确认邮件
   - 重置密码邮件
   - 邀请邮件

---

## 第五步：测试（1分钟）

### 1. 打开游戏
在浏览器中打开 `index.html`

### 2. 注册账号
1. 点击灵动岛
2. 切换到"注册"标签
3. 填写邮箱、密码、用户名
4. 点击"注册"

### 3. 验证邮箱
1. 检查邮箱（包括垃圾邮件）
2. 点击验证链接
3. 返回游戏，刷新页面

### 4. 登录
1. 使用刚才的邮箱和密码登录
2. 登录成功后，灵动岛会显示你的用户名

### 5. 玩游戏
1. 选择一首歌
2. 玩完后，成绩会自动保存到云端
3. 在 Supabase 后台可以看到数据

---

## 🎉 完成！

现在你的游戏已经有了：
- ✅ 用户注册/登录系统
- ✅ 自动保存游戏成绩
- ✅ 云端数据存储
- ✅ 完全免费

---

## 📊 查看数据

### 在 Supabase 后台查看
1. 点击 **🗄️ Table Editor**
2. 选择 **scores** 表
3. 可以看到所有玩家的成绩

### 查看用户
1. 点击 **👤 Authentication**
2. 可以看到所有注册用户

---

## 🚀 下一步（可选功能）

### 1. 添加排行榜显示
在 `game.js` 中调用：
```javascript
// 获取全球排行榜
const result = await getLeaderboard(null, 10);
console.log('排行榜:', result.leaderboard);
```

### 2. 显示个人历史
```javascript
// 获取用户历史成绩
const result = await getUserScores(10);
console.log('历史成绩:', result.scores);
```

### 3. 显示统计数据
```javascript
// 获取用户统计
const result = await getUserStats();
console.log('统计数据:', result.stats);
```

---

## ❓ 常见问题

### Q: 注册后没收到邮件？
A: 检查垃圾邮件，或在 Supabase 后台手动确认用户

### Q: 免费额度够用吗？
A: 完全够用！免费额度：
- 500MB 数据库
- 1GB 文件存储
- 50,000 月活用户
- 无限 API 请求

### Q: 数据会丢失吗？
A: 不会！Supabase 使用 PostgreSQL，数据永久保存

### Q: 可以导出数据吗？
A: 可以！在 Table Editor 中可以导出 CSV

### Q: 如何删除测试数据？
A: 在 Table Editor 中选择行，点击删除

---

## 🔒 安全提示

1. **不要泄露 API 密钥**：虽然 `anon key` 是公开的，但不要分享到公开仓库
2. **使用环境变量**：生产环境建议使用环境变量存储密钥
3. **启用 RLS**：已经配置好了行级安全，用户只能操作自己的数据

---

## 📚 更多资源

- Supabase 官方文档：https://supabase.com/docs
- JavaScript SDK 文档：https://supabase.com/docs/reference/javascript
- 社区支持：https://github.com/supabase/supabase/discussions

---

## 🎮 开始游戏吧！

配置完成后，你的游戏就有了完整的用户系统和数据记忆功能。

玩家可以：
- 注册账号
- 保存成绩
- 查看历史
- 竞争排行榜

完全免费，永久使用！🎉
