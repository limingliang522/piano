# 用户系统 API 参考

## 📦 已实现的功能

所有 API 都在 `supabase-config.js` 中定义，可以直接在代码中调用。

---

## 🔐 用户认证 API

### 1. 用户注册
```javascript
const result = await signUp(email, password, username);

if (result.success) {
    console.log('注册成功:', result.user);
} else {
    console.error('注册失败:', result.error);
}
```

**参数：**
- `email` (string): 邮箱地址
- `password` (string): 密码（至少6位）
- `username` (string): 用户名

**返回：**
```javascript
{
    success: true,
    user: {
        id: "uuid",
        email: "user@example.com",
        user_metadata: {
            username: "玩家名"
        }
    }
}
```

---

### 2. 用户登录
```javascript
const result = await signIn(email, password);

if (result.success) {
    console.log('登录成功:', result.user);
} else {
    console.error('登录失败:', result.error);
}
```

**参数：**
- `email` (string): 邮箱地址
- `password` (string): 密码

---

### 3. 用户登出
```javascript
const result = await signOut();

if (result.success) {
    console.log('登出成功');
}
```

---

### 4. 获取当前用户
```javascript
const user = await getCurrentUser();

if (user) {
    console.log('当前用户:', user.email);
} else {
    console.log('未登录');
}
```

**返回：**
```javascript
{
    id: "uuid",
    email: "user@example.com",
    user_metadata: {
        username: "玩家名"
    }
}
```

---

### 5. 监听认证状态变化
```javascript
onAuthStateChange((event, session) => {
    console.log('认证事件:', event); // 'SIGNED_IN', 'SIGNED_OUT', etc.
    
    if (session) {
        console.log('用户已登录:', session.user.email);
    } else {
        console.log('用户已登出');
    }
});
```

---

## 💾 游戏数据 API

### 1. 保存游戏成绩
```javascript
const scoreData = {
    midiName: '歌曲名',
    score: 12345,
    accuracy: 98.5,
    combo: 150,
    notesTriggered: 197,
    totalNotes: 200,
    speedMultiplier: 1.5
};

const result = await saveScore(scoreData);

if (result.success) {
    console.log('成绩已保存');
}
```

**参数：**
```javascript
{
    midiName: string,        // 歌曲名称
    score: number,           // 分数
    accuracy: number,        // 准确率（0-100）
    combo: number,           // 最大连击
    notesTriggered: number,  // 触发的音符数
    totalNotes: number,      // 总音符数
    speedMultiplier: number  // 速度倍数（可选）
}
```

---

### 2. 获取用户历史成绩
```javascript
const result = await getUserScores(10); // 获取最近10条

if (result.success) {
    result.scores.forEach(score => {
        console.log(`${score.midi_name}: ${score.score}分`);
    });
}
```

**参数：**
- `limit` (number): 返回数量，默认10

**返回：**
```javascript
{
    success: true,
    scores: [
        {
            id: 1,
            midi_name: "歌曲1",
            score: 12345,
            accuracy: 98.5,
            combo: 150,
            created_at: "2024-01-01T00:00:00Z"
        },
        // ...
    ]
}
```

---

### 3. 获取用户最佳成绩
```javascript
const result = await getUserBestScores();

if (result.success) {
    result.scores.forEach(score => {
        console.log(`${score.midi_name}: 最高 ${score.score}分`);
    });
}
```

**返回：** 每首歌的最高分（按歌曲分组）

---

### 4. 获取全球排行榜
```javascript
// 获取所有歌曲的排行榜（前100名）
const result = await getLeaderboard(null, 100);

// 获取指定歌曲的排行榜
const result = await getLeaderboard('歌曲名', 50);

if (result.success) {
    result.leaderboard.forEach((entry, index) => {
        console.log(`${index + 1}. ${entry.users.username}: ${entry.score}分`);
    });
}
```

**参数：**
- `midiName` (string|null): 歌曲名称，null表示所有歌曲
- `limit` (number): 返回数量，默认100

**返回：**
```javascript
{
    success: true,
    leaderboard: [
        {
            id: 1,
            user_id: "uuid",
            midi_name: "歌曲1",
            score: 15000,
            accuracy: 99.5,
            combo: 200,
            created_at: "2024-01-01T00:00:00Z",
            users: {
                username: "玩家名",
                email: "user@example.com"
            }
        },
        // ...
    ]
}
```

---

### 5. 获取用户统计数据
```javascript
const result = await getUserStats();

if (result.success) {
    const stats = result.stats;
    console.log(`总游戏次数: ${stats.totalGames}`);
    console.log(`总分数: ${stats.totalScore}`);
    console.log(`平均准确率: ${stats.averageAccuracy.toFixed(2)}%`);
    console.log(`最高连击: ${stats.maxCombo}`);
    console.log(`最高分: ${stats.bestScore}`);
    console.log(`玩过的歌曲: ${stats.uniqueSongs}首`);
}
```

**返回：**
```javascript
{
    success: true,
    stats: {
        totalGames: 50,        // 总游戏次数
        totalScore: 500000,    // 总分数
        averageAccuracy: 95.5, // 平均准确率
        maxCombo: 250,         // 最高连击
        bestScore: 15000,      // 最高分
        uniqueSongs: 10        // 玩过的歌曲数
    }
}
```

---

### 6. 更新用户资料
```javascript
const result = await updateUserProfile({
    username: '新用户名',
    avatar_url: 'https://example.com/avatar.jpg'
});

if (result.success) {
    console.log('资料已更新');
}
```

**参数：** 任意用户元数据字段

---

## 🎮 在游戏中使用

### 游戏结束时自动保存
已经在 `game.js` 中集成，游戏结束时会自动调用 `saveGameScore()`

### 显示排行榜示例
```javascript
// 在灵动岛中显示排行榜
async function showLeaderboard() {
    const result = await getLeaderboard(currentMidiName, 10);
    
    if (result.success) {
        const leaderboardHTML = result.leaderboard.map((entry, index) => `
            <div class="leaderboard-item">
                <span class="rank">${index + 1}</span>
                <span class="name">${entry.users.username}</span>
                <span class="score">${entry.score}</span>
            </div>
        `).join('');
        
        document.getElementById('leaderboardContainer').innerHTML = leaderboardHTML;
    }
}
```

### 显示个人统计示例
```javascript
// 在用户页面显示统计
async function showUserStats() {
    const result = await getUserStats();
    
    if (result.success) {
        const stats = result.stats;
        document.getElementById('totalGames').textContent = stats.totalGames;
        document.getElementById('avgAccuracy').textContent = stats.averageAccuracy.toFixed(1) + '%';
        document.getElementById('bestScore').textContent = stats.bestScore;
    }
}
```

---

## 🔍 检查认证状态

### 在代码中检查
```javascript
// 全局变量（在 auth-system.js 中定义）
if (isAuthenticated) {
    console.log('用户已登录:', currentUser.email);
} else {
    console.log('用户未登录');
}
```

### 条件执行
```javascript
// 只有登录用户才能执行某些操作
if (isAuthenticated) {
    await saveScore(scoreData);
} else {
    alert('请先登录');
}
```

---

## 🛠️ 调试技巧

### 1. 查看 Supabase 连接状态
```javascript
console.log('Supabase 已初始化:', supabase !== null);
```

### 2. 查看当前用户
```javascript
getCurrentUser().then(user => {
    console.log('当前用户:', user);
});
```

### 3. 测试保存成绩
```javascript
// 在浏览器控制台中测试
saveScore({
    midiName: '测试歌曲',
    score: 9999,
    accuracy: 100,
    combo: 100,
    notesTriggered: 100,
    totalNotes: 100
}).then(result => {
    console.log('保存结果:', result);
});
```

### 4. 查看排行榜
```javascript
// 在浏览器控制台中测试
getLeaderboard(null, 10).then(result => {
    console.table(result.leaderboard);
});
```

---

## ⚠️ 错误处理

所有 API 都返回统一格式：
```javascript
{
    success: true/false,
    data: ...,      // 成功时的数据
    error: "..."    // 失败时的错误信息
}
```

**示例：**
```javascript
const result = await saveScore(scoreData);

if (result.success) {
    console.log('✅ 成功');
} else {
    console.error('❌ 失败:', result.error);
    alert('保存失败: ' + result.error);
}
```

---

## 📝 数据库表结构

### scores 表
```sql
id              BIGSERIAL PRIMARY KEY
user_id         UUID (外键到 auth.users)
midi_name       TEXT (歌曲名)
score           INTEGER (分数)
accuracy        NUMERIC(5,2) (准确率)
combo           INTEGER (连击)
notes_triggered INTEGER (触发音符数)
total_notes     INTEGER (总音符数)
speed_multiplier NUMERIC(3,2) (速度倍数)
created_at      TIMESTAMP (创建时间)
```

---

## 🚀 性能优化

### 1. 批量保存（未来功能）
```javascript
// 可以扩展为批量保存多个成绩
const scores = [scoreData1, scoreData2, scoreData3];
// await saveBatchScores(scores);
```

### 2. 缓存排行榜
```javascript
// 缓存排行榜数据，减少 API 调用
let cachedLeaderboard = null;
let cacheTime = 0;

async function getCachedLeaderboard() {
    const now = Date.now();
    if (cachedLeaderboard && now - cacheTime < 60000) { // 1分钟缓存
        return cachedLeaderboard;
    }
    
    const result = await getLeaderboard(null, 100);
    if (result.success) {
        cachedLeaderboard = result.leaderboard;
        cacheTime = now;
    }
    return cachedLeaderboard;
}
```

---

## 🎉 完成！

现在你可以在游戏中使用完整的用户系统和数据存储功能了！
