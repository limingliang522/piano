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
    
    userNameDisplay = document.getElementById('displayUsername');
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
    
    // 更改用户名按钮
    const changeUsernameBtn = document.getElementById('changeUsernameBtn');
    if (changeUsernameBtn) {
        changeUsernameBtn.addEventListener('click', handleChangeUsername);
    }
    
    // 注销账号按钮
    const deleteAccountBtn = document.getElementById('deleteAccountBtn');
    if (deleteAccountBtn) {
        deleteAccountBtn.addEventListener('click', handleDeleteAccount);
    }
    
    // 管理员工具：修复重复用户名
    const fixDuplicateUsernamesBtn = document.getElementById('fixDuplicateUsernamesBtn');
    if (fixDuplicateUsernamesBtn) {
        fixDuplicateUsernamesBtn.addEventListener('click', async () => {
            if (!confirm('确定要修复重复的用户名吗？这将把重复的用户名改为"未知_随机数"')) {
                return;
            }
            
            fixDuplicateUsernamesBtn.disabled = true;
            fixDuplicateUsernamesBtn.textContent = '修复中...';
            
            const result = await fixDuplicateUsernames();
            
            if (result.success) {
                alert(`修复完成！共修复 ${result.fixedCount} 个重复用户名`);
            } else {
                alert(`修复失败：${result.error}`);
            }
            
            fixDuplicateUsernamesBtn.disabled = false;
            fixDuplicateUsernamesBtn.textContent = '🔧 修复重复用户名';
        });
    }
    
    // "立即登录"按钮
    const goToLoginBtn = document.getElementById('goToLoginBtn');
    if (goToLoginBtn) {
        goToLoginBtn.addEventListener('click', () => {
            // 切换到认证模式
            const dynamicIsland = document.getElementById('dynamicIsland');
            if (dynamicIsland && !dynamicIsland.classList.contains('auth-mode')) {
                dynamicIsland.classList.add('auth-mode');
            }
            
            // 切换到登录标签
            const loginTab = document.querySelector('.auth-tab[data-auth-tab="login"]');
            if (loginTab) loginTab.click();
        });
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
        
        // 清除本地存储
        localStorage.removeItem('unlockedMusic');
        localStorage.removeItem('puzzlePieces');
        
        // 重新加载音乐解锁系统
        if (typeof musicUnlockSystem !== 'undefined' && musicUnlockSystem) {
            await musicUnlockSystem.loadUnlockedMusic();
            console.log('🔄 已重新加载用户音乐数据');
        }
        
        // 恢复按钮状态
        loginSubmit.disabled = false;
        loginSubmit.textContent = '登录';
        
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
    const passwordConfirm = document.getElementById('registerPasswordConfirm').value;
    
    // 验证输入
    if (!email || !password || !username || !passwordConfirm) {
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
    
    if (password !== passwordConfirm) {
        showMessage(registerMessage, '两次密码不一致', 'error');
        return;
    }
    
    // 禁用按钮，显示加载状态
    registerSubmit.disabled = true;
    registerSubmit.textContent = '注册中...';
    showMessage(registerMessage, '正在注册...', '');
    
    // 调用注册 API
    const result = await signUp(email, password, username);
    
    if (result.success) {
        // 清空表单
        registerEmail.value = '';
        registerPassword.value = '';
        registerUsername.value = '';
        document.getElementById('registerPasswordConfirm').value = '';
        
        // 清除本地存储
        localStorage.removeItem('unlockedMusic');
        localStorage.removeItem('puzzlePieces');
        
        // 检查是否需要邮箱验证
        if (result.session) {
            // 已经登录，不需要邮箱验证
            showMessage(registerMessage, '注册成功！正在初始化...', 'success');
            
            // 恢复按钮状态
            registerSubmit.disabled = false;
            registerSubmit.textContent = '注册';
            
            // 延迟关闭灵动岛，让用户看到成功消息
            setTimeout(() => {
                dynamicIsland.classList.remove('expanded', 'auth-mode');
                isIslandExpanded = false;
                
                // 刷新页面以加载用户数据
                location.reload();
            }, 1500);
        } else {
            // 需要邮箱验证
            showMessage(registerMessage, '注册成功！请检查邮箱验证链接', 'success');
            
            // 恢复按钮状态
            registerSubmit.disabled = false;
            registerSubmit.textContent = '注册';
            
            // 切换到登录标签
            setTimeout(() => {
                const loginTab = document.querySelector('.auth-tab[data-auth-tab="login"]');
                if (loginTab) loginTab.click();
            }, 2000);
        }
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
    
    // 先同步数据到云端
    if (typeof cloudSyncManager !== 'undefined' && cloudSyncManager) {
        console.log('☁️ 退出前同步数据到云端...');
        await cloudSyncManager.pushAllDataToCloud();
    }
    
    const result = await signOut();
    
    if (result.success) {
        // 清空所有本地数据
        if (typeof clearAllLocalData === 'function') {
            clearAllLocalData();
        }
        
        // 状态会通过 onAuthStateChange 自动更新
        console.log('✅ 已退出登录');
        // 恢复按钮状态
        logoutButton.disabled = false;
        logoutButton.textContent = '🚪 退出登录';
    } else {
        alert('退出失败，请重试');
        logoutButton.disabled = false;
        logoutButton.textContent = '🚪 退出登录';
    }
}

/**
 * 处理更改用户名
 */
async function handleChangeUsername() {
    const currentUsername = currentUser?.user_metadata?.username || '未知';
    
    const newUsername = prompt(`当前用户名：${currentUsername}\n\n请输入新的用户名（至少2个字符）：`);
    
    if (!newUsername) {
        return; // 用户取消
    }
    
    if (newUsername.trim().length < 2) {
        alert('用户名至少需要2个字符');
        return;
    }
    
    if (newUsername.trim() === currentUsername) {
        alert('新用户名与当前用户名相同');
        return;
    }
    
    const changeUsernameBtn = document.getElementById('changeUsernameBtn');
    if (changeUsernameBtn) {
        changeUsernameBtn.disabled = true;
        changeUsernameBtn.textContent = '更改中...';
    }
    
    const result = await updateUserProfile({ username: newUsername.trim() });
    
    // 恢复按钮状态
    if (changeUsernameBtn) {
        changeUsernameBtn.disabled = false;
        changeUsernameBtn.textContent = '✏️ 更改用户名';
    }
    
    if (result.success) {
        alert('用户名更改成功！');
        
        // 更新显示
        if (userNameDisplay) {
            userNameDisplay.textContent = newUsername.trim();
        }
        
        // 更新当前用户信息
        currentUser = result.user;
    } else {
        alert(`更改失败：${result.error}`);
    }
}

/**
 * 处理注销账号
 */
async function handleDeleteAccount() {
    const currentUsername = currentUser?.user_metadata?.username || currentUser?.email || '未知';
    
    const confirmation1 = confirm(
        `⚠️ 警告：注销账号将永久删除以下数据：\n\n` +
        `• 所有游戏成绩记录\n` +
        `• 已解锁的音乐\n` +
        `• 拼图碎片和道具\n` +
        `• 用户统计数据\n\n` +
        `此操作不可恢复！\n\n` +
        `确定要注销账号"${currentUsername}"吗？`
    );
    
    if (!confirmation1) {
        return;
    }
    
    const confirmation2 = prompt(
        `请输入您的用户名"${currentUsername}"以确认注销：`
    );
    
    if (confirmation2 !== currentUsername) {
        alert('用户名不匹配，注销已取消');
        return;
    }
    
    const deleteAccountBtn = document.getElementById('deleteAccountBtn');
    if (deleteAccountBtn) {
        deleteAccountBtn.disabled = true;
        deleteAccountBtn.textContent = '注销中...';
    }
    
    const result = await deleteAccount();
    
    if (result.success) {
        alert('账号已完全删除！');
        
        // 恢复按钮状态
        if (deleteAccountBtn) {
            deleteAccountBtn.disabled = false;
            deleteAccountBtn.textContent = '🗑️ 注销账号';
        }
        
        // 用户已自动登出，UI会通过 onAuthStateChange 更新
    } else {
        alert(`注销失败：${result.error}`);
        
        if (deleteAccountBtn) {
            deleteAccountBtn.disabled = false;
            deleteAccountBtn.textContent = '🗑️ 注销账号';
        }
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
        
        // 清除本地存储，确保使用数据库数据
        localStorage.removeItem('unlockedMusic');
        localStorage.removeItem('puzzlePieces');
        
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
        
        // 清除旧的本地存储数据（确保使用数据库数据）
        localStorage.removeItem('unlockedMusic');
        localStorage.removeItem('puzzlePieces');
        
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
async function updateUIForAuthenticatedUser(user) {
    console.log('✅ 用户已登录:', user.email);
    
    // 更新用户名显示
    const username = user.user_metadata?.username || user.email.split('@')[0];
    if (userNameDisplay) {
        userNameDisplay.textContent = username;
    }
    
    // 显示/隐藏用户页面元素
    const loginPrompt = document.getElementById('loginPrompt');
    const userStatsSection = document.getElementById('userStatsSection');
    const accountManagementSection = document.getElementById('accountManagementSection');
    const logoutSection = document.getElementById('logoutSection');
    const adminSection = document.getElementById('adminSection');
    
    if (loginPrompt) loginPrompt.style.display = 'none';
    if (userStatsSection) userStatsSection.style.display = 'block';
    if (accountManagementSection) accountManagementSection.style.display = 'block';
    if (logoutSection) logoutSection.style.display = 'block';
    
    // 显示管理员工具（开发环境或本地环境）
    if (adminSection && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')) {
        adminSection.style.display = 'block';
    }
    
    // 更新灵动岛标题（如果函数存在）
    if (typeof updateIslandTitle === 'function') {
        updateIslandTitle();
    }
    
    // 如果灵动岛处于认证模式，切换到音乐选择模式
    if (typeof dynamicIsland !== 'undefined' && dynamicIsland.classList.contains('auth-mode')) {
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
    
    // ========== 云端数据同步 ==========
    // 从云端加载所有数据并应用到游戏
    if (typeof initCloudSync === 'function') {
        console.log('☁️ 初始化云端数据同步...');
        await initCloudSync();
    }
    
    // 加载用户数据
    loadUserData();
}

/**
 * 更新 UI（未登录状态）
 */
function updateUIForUnauthenticatedUser() {
    console.log('ℹ️ 用户未登录');
    
    // 更新用户名显示
    if (userNameDisplay) {
        userNameDisplay.textContent = '未登录';
    }
    
    // 显示/隐藏用户页面元素
    const loginPrompt = document.getElementById('loginPrompt');
    const userStatsSection = document.getElementById('userStatsSection');
    const accountManagementSection = document.getElementById('accountManagementSection');
    const logoutSection = document.getElementById('logoutSection');
    
    if (loginPrompt) loginPrompt.style.display = 'block';
    if (userStatsSection) userStatsSection.style.display = 'none';
    if (accountManagementSection) accountManagementSection.style.display = 'none';
    if (logoutSection) logoutSection.style.display = 'none';
    
    // 更新灵动岛标题（如果函数存在）
    if (typeof updateIslandTitle === 'function') {
        updateIslandTitle();
    }
    
    // 如果灵动岛展开且不在认证模式，切换到认证模式
    if (typeof isIslandExpanded !== 'undefined' && isIslandExpanded && typeof dynamicIsland !== 'undefined' && !dynamicIsland.classList.contains('auth-mode')) {
        dynamicIsland.classList.add('auth-mode');
    }
    
    // ========== 清空本地数据 ==========
    // 用户未登录，清空所有本地数据
    if (typeof clearAllLocalData === 'function') {
        clearAllLocalData();
    }
    
    // 停止自动同步
    if (typeof cloudSyncManager !== 'undefined' && cloudSyncManager) {
        cloudSyncManager.stopAutoSync();
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
            
            // 更新统计数据显示
            const stats = statsResult.stats;
            const statTotalGames = document.getElementById('statTotalGames');
            const statBestScore = document.getElementById('statBestScore');
            const statAvgAccuracy = document.getElementById('statAvgAccuracy');
            const statMaxCombo = document.getElementById('statMaxCombo');
            
            if (statTotalGames) statTotalGames.textContent = stats.totalGames || 0;
            if (statBestScore) statBestScore.textContent = stats.bestScore || 0;
            if (statAvgAccuracy) statAvgAccuracy.textContent = (stats.averageAccuracy || 0).toFixed(1) + '%';
            if (statMaxCombo) statMaxCombo.textContent = stats.maxCombo || 0;
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
            
            // 不再显示保存成功提示（已移除）
            // showSaveSuccessNotification();
            
            // 触发完整的云端数据同步（包括拼图碎片等所有数据）
            if (typeof cloudSyncManager !== 'undefined' && cloudSyncManager) {
                await cloudSyncManager.pushAllDataToCloud();
            }
        } else {
            console.error('❌ 成绩保存失败:', result.error);
        }
    } catch (error) {
        console.error('❌ 保存成绩时出错:', error);
    }
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
