# 🚀 快速开始 - 5分钟接入用户系统

## ✅ 你已经完成的工作

我已经帮你创建了以下文件：
- ✅ `supabase-config.js` - Supabase 配置和 API
- ✅ `auth-system.js` - 用户认证系统
- ✅ `test-supabase.html` - 测试页面
- ✅ 修改了 `index.html` - 引入了 SDK
- ✅ 修改了 `game.js` - 游戏结束时自动保存成绩

---

## 📋 你需要做的 3 件事

### 1️⃣ 创建 Supabase 项目（2分钟）

1. 访问 https://supabase.com
2. 用 GitHub 登录（或邮箱注册）
3. 点击 **New Project**
4. 填写：
   - Name: `piano-game`
   - Password: 自动生成（保存好）
   - Region: **Northeast Asia (Tokyo)** 或 **Southeast Asia (Singapore)**
   - Plan: **Free**（免费）
5. 等待项目创建完成（1-2分钟）

---

### 2️⃣ 配置 API 密钥（1分钟）

1. 在 Supabase 项目中，点击 **⚙️ Settings** → **API**
2. 复制两个值：
   - **Project URL**: `https://xxxxx.supabase.co`
   - **anon public**: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`

3. 打开 `supabase-config.js`，替换：

```javascript
const SUPABASE_CONFIG = {
    url: 'https://你的项目ID.supabase.co',  // 👈 粘贴 Project URL
    anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'  // 👈 粘贴 anon public
};
```

---

### 3️⃣ 创建数据库表（2分钟）

1. 在 Supabase 项目中，点击 **🗄️ SQL Editor**
2. 点击 **+ New query**
3. 复制粘贴以下 SQL：

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

-- 创建索引
CREATE INDEX idx_scores_user_id ON scores(user_id);
CREATE INDEX idx_scores_midi_name ON scores(midi_name);
CREATE INDEX idx_scores_score ON scores(score DESC);

-- 启用行级安全
ALTER TABLE scores ENABLE ROW LEVEL SECURITY;

-- 允许查看所有成绩
CREATE POLICY "Anyone can view scores"
    ON scores FOR SELECT
    USING (true);

-- 允许插入自己的成绩
CREATE POLICY "Users can insert own scores"
    ON scores FOR INSERT
    WITH CHECK (auth.uid() = user_id);
```

4. 点击 **Run**（或按 `Ctrl+Enter`）
5. 看到 **Success** 表示成功

---

## 🧪 测试配置

### 方法1：使用测试页面（推荐）

1. 在浏览器中打开 `test-supabase.html`
2. 页面会自动检测配置
3. 按照提示测试各项功能

### 方法2：直接玩游戏

1. 打开 `index.html`
2. 点击灵动岛
3. 切换到"注册"标签
4. 填写邮箱、密码、用户名
5. 点击"注册"
6. 检查邮箱验证链接
7. 登录后玩游戏，成绩会自动保存

---

## ✨ 完成！

现在你的游戏已经有了：

### 🔐 用户系统
- ✅ 邮箱注册/登录
- ✅ 自动记住登录状态
- ✅ 用户资料管理

### 💾 数据存储
- ✅ 自动保存游戏成绩
- ✅ 查看历史记录
- ✅ 个人最佳成绩

### 🏆 排行榜（API 已就绪）
- ✅ 全球排行榜
- ✅ 单曲排行榜
- ✅ 好友排行榜

### 📊 统计数据（API 已就绪）
- ✅ 总游戏次数
- ✅ 平均准确率
- ✅ 最高连击
- ✅ 最高分

---

## 🎮 游戏中的变化

### 登录前
- 点击灵动岛 → 显示登录/注册界面
- 游戏结束后不保存成绩

### 登录后
- 灵动岛显示用户名
- 游戏结束后自动保存成绩到云端
- 可以查看历史记录和排行榜

---

## 📚 更多功能

### 显示排行榜
在 `game.js` 中添加：

```javascript
async function showLeaderboard() {
    const result = await getLeaderboard(currentMidiName, 10);
    if (result.success) {
        console.log('排行榜:', result.leaderboard);
        // 在 UI 中显示
    }
}
```

### 显示个人统计
```javascript
async function showUserStats() {
    const result = await getUserStats();
    if (result.success) {
        console.log('统计:', result.stats);
        // 在 UI 中显示
    }
}
```

### 显示历史记录
```javascript
async function showHistory() {
    const result = await getUserScores(10);
    if (result.success) {
        console.log('历史:', result.scores);
        // 在 UI 中显示
    }
}
```

---

## 🔍 调试技巧

### 查看浏览器控制台
按 `F12` 打开开发者工具，查看：
- ✅ Supabase 初始化成功
- 🔐 认证状态变化
- 💾 成绩保存成功

### 查看 Supabase 后台
1. 点击 **🗄️ Table Editor**
2. 选择 **scores** 表
3. 可以看到所有保存的成绩

### 查看用户列表
1. 点击 **👤 Authentication**
2. 可以看到所有注册用户

---

## ❓ 常见问题

### Q: 注册后没收到邮件？
A: 检查垃圾邮件，或在 Supabase 后台手动确认用户

### Q: 成绩没有保存？
A: 
1. 检查浏览器控制台是否有错误
2. 确认已登录
3. 在 Supabase 后台查看 scores 表

### Q: 配置错误？
A: 打开 `test-supabase.html` 查看详细错误信息

### Q: 免费额度够用吗？
A: 完全够用！
- 500MB 数据库
- 50,000 月活用户
- 无限 API 请求

---

## 📖 详细文档

- **配置指南**: `SUPABASE_SETUP_GUIDE.md`
- **API 参考**: `USER_SYSTEM_API.md`
- **测试页面**: `test-supabase.html`

---

## 🎉 开始游戏吧！

配置完成后，你的游戏就有了完整的用户系统。

玩家可以：
1. 注册账号
2. 登录游戏
3. 保存成绩
4. 查看历史
5. 竞争排行榜

**完全免费，永久使用！** 🚀
