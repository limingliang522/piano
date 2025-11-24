// 用户认证系统 - 连接 UI 和 Supabase
// 管理登录/注册界面交互和状态

// 全局状态
let isAuthenticated = false;
let currentUser = null;

// DOM 元素引用
let loginForm, registerForm;
let loginEmail, loginPassword, loginSubmit, loginMessage;
let registerEmail, registerPassword, registerUsername, registerSubmit, registerMessage;
let userNameDisplay, logoutButton;

/**
 * 初始化认证系统
 */
function initAuthSystem() {
    console.log('🔐 初始化认证系统...');
    
    // 初始化 Supabase
    if (!initSupabase()) {
        console.warn('⚠️ Supabase 未配置，使用离线模式');
        return;
    }
    
    // 获取 DOM 元素
    loginForm = document.getElementById('loginForm');
    registerForm = document.getElementById('registerForm');
    
    loginEmail = document.getElementById('loginEmail');
    loginPassword = document.getElementById('loginPassword');
    loginSubmit = document.getElementById('loginSubmit');
    loginMessage = document.getElementById('loginMessage');
    
    registerEmail = document.getElementById('registerEmail');
    registerPassword = document.getElementById('registerPassword');
    registerUsername = document.getElementById('registerUsername');
    registerSubmit = document.getElementById('registerSubmit');
    registerMessage = document.getElementById('registerMessage');
    
    userNameDisplay = document.getElementById('userName');
    logoutButton = document.getElementById('logoutBtn');
    
    // 绑定事件
    setupAuthEvents();
    
    // 监听认证状态变化
    onAuthStateChange(handleAuthStateChange);
    
    // 检查当前登录状态
    checkAuthStatus();
    
    console.log('✅ 认证系统初始化完成');
}

/**
 * 设置认证相关事件
 */
function setupAuthEvents() {
    // 登录表单提交
    if (loginSubmit) {
        loginSubmit.addEventListener('click', handleLogin);
    }
    
    // 注册表单提交
    if (registerSubmit) {
        registerSubmit.addEventListener('click', handleRegister);
    }
    
    // 登出按钮
    if (logoutButton) {
        logoutButton.addEventListener('click', handleLogout);
    }
    
    // 回车键提交
    if (loginPassword) {
        loginPassword.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') handleLogin();
        });
    }
    
    if (registerPassword) {
        registerPassword.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') handleRegister();
        });
    }
}

/**
 * 处理登录
 */
async function handleLogin() {
    const email = loginEmail.value.trim();
    const password = loginPassword.value;
    
    // 验证输入
    if (!email || !password) {
        showMessage(loginMessage, '请填写邮箱和密码', 'error');
        return;
    }
    
    if (!isValidEmail(email)) {
        showMessage(loginMessage, '邮箱格式不正确', 'error');
        return;
    }
    
    // 禁用按钮，显示加载状态
    loginSubmit.disabled = true;
    loginSubmit.textContent = '登录中...';
    showMessage(loginMessage, '正在登录...', '');
    
    // 调用登录 API
    const result = await signIn(email, password);
    
    if (result.success) {
        showMessage(loginMessage, '登录成功！', 'success');
        
        // 清空表单
        loginEmail.value = '';
        loginPassword.value = '';
        
        // 延迟关闭灵动岛
        setTimeout(() => {
            dynamicIsland.classList.remove('expanded', 'auth-mode');
            isIslandExpanded = false;
        }, 1000);
    } else {
        showMessage(loginMessage, `登录失败：${result.error}`, 'error');
        loginSubmit.disabled = false;
        loginSubmit.textContent = '登录';
    }
}

/**
 * 处理注册
 */
async function handleRegister() {
    const email = registerEmail.value.trim();
    const password = registerPassword.value;
    const username = registerUsername.value.trim();
    
    // 验证输入
    if (!email || !password || !username) {
        showMessage(registerMessage, '请填写所有字段', 'error');
        return;
    }
    
    if (!isValidEmail(email)) {
        showMessage(registerMessage, '邮箱格式不正确', 'error');
        return;
    }
    
    if (password.length < 6) {
        showMessage(registerMessage, '密码至少6位', 'error');
        return;
    }
    
    if (username.length < 2) {
        showMessage(registerMessage, '用户名至少2个字符', 'error');
        return;
    }
    
    // 禁用按钮，显示加载状态
    registerSubmit.disabled = true;
    registerSubmit.textContent = '注册中...';
    showMessage(registerMessage, '正在注册...', '');
    
    // 调用注册 API
    const result = await signUp(email, password, username);
    
    if (result.success) {
        showMessage(registerMessage, '注册成功！请检查邮箱验证链接', 'success');
        
        // 清空表单
        registerEmail.value = '';
        registerPassword.value = '';
        registerUsername.value = '';
        
        // 切换到登录标签
        setTimeout(() => {
            document.querySelector('.auth-tab[data-tab="login"]').click();
        }, 2000);
    } else {
        showMessage(registerMessage, `注册失败：${result.error}`, 'error');
        registerSubmit.disabled = false;
        registerSubmit.textContent = '注册';
    }
}

/**
 * 处理登出
 */
async function handleLogout() {
    if (!confirm('确定要退出登录吗？')) {
        return;
    }
    
    logoutButton.disabled = true;
    logoutButton.textContent = '退出中...';
    
    const result = await signOut();
    
    if (result.success) {
        // 状态会通过 onAuthStateChange 自动更新
        console.log('✅ 已退出登录');
    } else {
        alert('退出失败，请重试');
        logoutButton.disabled = false;
        logoutButton.textContent = '退出登录';
    }
}

/**
 * 检查认证状态
 */
async function checkAuthStatus() {
    const user = await getCurrentUser();
    
    if (user) {
        isAuthenticated = true;
        currentUser = user;
        updateUIForAuthenticatedUser(user);
    } else {
        isAuthenticated = false;
        currentUser = null;
        updateUIForUnauthenticatedUser();
    }
}

/**
 * 处理认证状态变化
 */
function handleAuthStateChange(event, session) {
    if (session && session.user) {
        // 用户已登录
        isAuthenticated = true;
        currentUser = session.user;
        updateUIForAuthenticatedUser(session.user);
    } else {
        // 用户未登录
        isAuthenticated = false;
        currentUser = null;
        updateUIForUnauthenticatedUser();
    }
}

/**
 * 更新 UI（已登录状态）
 */
function updateUIForAuthenticatedUser(user) {
    console.log('✅ 用户已登录:', user.email);
    
    // 更新用户名显示
    const username = user.user_metadata?.username || user.email.split('@')[0];
    if (userNameDisplay) {
        userNameDisplay.textContent = username;
    }
    
    // 更新灵动岛标题（如果函数存在）
    if (typeof updateIslandTitle === 'function') {
        updateIslandTitle();
    }
    
    // 如果灵动岛处于认证模式，切换到音乐选择模式
    if (dynamicIsland.classList.contains('auth-mode')) {
        dynamicIsland.classList.remove('auth-mode');
        
        // 切换到音乐标签
        setTimeout(() => {
            const musicTab = document.querySelector('.island-tab[data-tab="music"]');
            if (musicTab) musicTab.click();
        }, 500);
    }
    
    // 启用登出按钮
    if (logoutButton) {
        logoutButton.disabled = false;
        logoutButton.textContent = '退出登录';
    }
    
    // 加载用户数据
    loadUserData();
}

/**
 * 更新 UI（未登录状态）
 */
function updateUIForUnauthenticatedUser() {
    console.log('ℹ️ 用户未登录');
    
    // 更新灵动岛标题（如果函数存在）
    if (typeof updateIslandTitle === 'function') {
        updateIslandTitle();
    }
    
    // 如果灵动岛展开且不在认证模式，切换到认证模式
    if (typeof isIslandExpanded !== 'undefined' && isIslandExpanded && typeof dynamicIsland !== 'undefined' && !dynamicIsland.classList.contains('auth-mode')) {
        dynamicIsland.classList.add('auth-mode');
    }
}

/**
 * 加载用户数据
 */
async function loadUserData() {
    try {
        // 加载用户统计
        const statsResult = await getUserStats();
        if (statsResult.success) {
            console.log('📊 用户统计:', statsResult.stats);
            // 可以在这里更新 UI 显示统计数据
        }
        
        // 加载最佳成绩
        const bestScoresResult = await getUserBestScores();
        if (bestScoresResult.success) {
            console.log('🏆 最佳成绩:', bestScoresResult.scores);
            // 可以在这里更新 UI 显示最佳成绩
        }
    } catch (error) {
        console.error('❌ 加载用户数据失败:', error);
    }
}

/**
 * 显示消息
 */
function showMessage(element, message, type) {
    if (!element) return;
    
    element.textContent = message;
    element.className = 'auth-message';
    
    if (type === 'success') {
        element.classList.add('success');
    } else if (type === 'error') {
        element.classList.add('error');
    }
}

/**
 * 验证邮箱格式
 */
function isValidEmail(email) {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
}

/**
 * 游戏结束后保存成绩
 */
async function saveGameScore() {
    if (!isAuthenticated) {
        console.log('ℹ️ 用户未登录，跳过成绩保存');
        return;
    }
    
    try {
        // 从全局变量获取游戏数据
        const gameScore = typeof score !== 'undefined' ? score : 0;
        const triggered = typeof notesTriggered !== 'undefined' ? notesTriggered : 0;
        const total = typeof totalNotes !== 'undefined' ? totalNotes : 1;
        const songName = typeof currentMidiName !== 'undefined' ? currentMidiName : '未知歌曲';
        const speed = typeof speedMultiplier !== 'undefined' ? speedMultiplier : 1.0;
        
        // 计算准确率
        const accuracy = total > 0 ? parseFloat(((triggered / total) * 100).toFixed(2)) : 0;
        
        // 计算最大连击（简化版，使用触发数作为连击）
        const maxCombo = triggered;
        
        const scoreData = {
            midiName: songName,
            score: gameScore,
            accuracy: accuracy,
            combo: maxCombo,
            notesTriggered: triggered,
            totalNotes: total,
            speedMultiplier: speed
        };
        
        console.log('💾 准备保存成绩:', scoreData);
        
        const result = await saveScore(scoreData);
        
        if (result.success) {
            console.log('✅ 成绩已保存到云端');
            
            // 显示保存成功提示（可选）
            showSaveSuccessNotification();
        } else {
            console.error('❌ 成绩保存失败:', result.error);
        }
    } catch (error) {
        console.error('❌ 保存成绩时出错:', error);
    }
}

/**
 * 显示保存成功通知
 */
function showSaveSuccessNotification() {
    // 创建通知元素
    const notification = document.createElement('div');
    notification.style.cssText = `
        position: fixed;
        top: 80px;
        left: 50%;
        transform: translateX(-50%);
        background: rgba(74, 222, 128, 0.9);
        color: white;
        padding: 12px 24px;
        border-radius: 8px;
        font-size: 14px;
        font-weight: 600;
        z-index: 10000;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
        animation: slideDown 0.3s ease;
    `;
    notification.textContent = '✅ 成绩已保存';
    
    document.body.appendChild(notification);
    
    // 3秒后移除
    setTimeout(() => {
        notification.style.animation = 'slideUp 0.3s ease';
        setTimeout(() => {
            document.body.removeChild(notification);
        }, 300);
    }, 3000);
}

// 在页面加载完成后初始化
if (typeof window !== 'undefined') {
    // 等待 DOM 加载完成
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            // 延迟初始化，确保其他脚本已加载
            setTimeout(initAuthSystem, 100);
        });
    } else {
        setTimeout(initAuthSystem, 100);
    }
}
