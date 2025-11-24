// Supabase 配置和 API 封装
// 使用说明：
// 1. 访问 https://supabase.com 创建项目
// 2. 在项目设置中找到 API URL 和 anon key
// 3. 替换下面的 YOUR_SUPABASE_URL 和 YOUR_SUPABASE_ANON_KEY

const SUPABASE_CONFIG = {
    url: 'https://sqsesohatfpoxwwykpmq.supabase.co',
    anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNxc2Vzb2hhdGZwb3h3d3lrcG1xIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM5NTA2ODIsImV4cCI6MjA3OTUyNjY4Mn0.YsN46f1-JYUGNAv3AGXDxy86tODRHvPFW5JlvauyTmE'
};

// Supabase 客户端实例
let supabase = null;

// 初始化 Supabase
function initSupabase() {
    if (!window.supabase) {
        console.error('❌ Supabase SDK 未加载，请检查 index.html 中的 script 标签');
        return false;
    }
    
    if (SUPABASE_CONFIG.url === 'YOUR_SUPABASE_URL') {
        console.warn('⚠️ 请先配置 Supabase URL 和 API Key');
        return false;
    }
    
    try {
        supabase = window.supabase.createClient(SUPABASE_CONFIG.url, SUPABASE_CONFIG.anonKey);
        console.log('✅ Supabase 初始化成功');
        return true;
    } catch (error) {
        console.error('❌ Supabase 初始化失败:', error);
        return false;
    }
}

// ============================================================================
// 用户认证 API
// ============================================================================

/**
 * 用户注册
 * @param {string} email - 邮箱
 * @param {string} password - 密码
 * @param {string} username - 用户名
 */
async function signUp(email, password, username) {
    try {
        const { data, error } = await supabase.auth.signUp({
            email: email,
            password: password,
            options: {
                data: {
                    username: username
                }
            }
        });
        
        if (error) throw error;
        
        console.log('✅ 注册成功:', data);
        return { success: true, user: data.user };
    } catch (error) {
        console.error('❌ 注册失败:', error);
        return { success: false, error: error.message };
    }
}

/**
 * 用户登录
 * @param {string} email - 邮箱
 * @param {string} password - 密码
 */
async function signIn(email, password) {
    try {
        const { data, error } = await supabase.auth.signInWithPassword({
            email: email,
            password: password
        });
        
        if (error) throw error;
        
        console.log('✅ 登录成功:', data);
        return { success: true, user: data.user };
    } catch (error) {
        console.error('❌ 登录失败:', error);
        return { success: false, error: error.message };
    }
}

/**
 * 用户登出
 */
async function signOut() {
    try {
        const { error } = await supabase.auth.signOut();
        if (error) throw error;
        
        console.log('✅ 登出成功');
        return { success: true };
    } catch (error) {
        console.error('❌ 登出失败:', error);
        return { success: false, error: error.message };
    }
}

/**
 * 获取当前用户
 */
async function getCurrentUser() {
    try {
        const { data: { user }, error } = await supabase.auth.getUser();
        if (error) throw error;
        return user;
    } catch (error) {
        console.error('❌ 获取用户失败:', error);
        return null;
    }
}

/**
 * 监听认证状态变化
 */
function onAuthStateChange(callback) {
    supabase.auth.onAuthStateChange((event, session) => {
        console.log('🔐 认证状态变化:', event, session?.user?.email);
        callback(event, session);
    });
}

// ============================================================================
// 游戏数据 API
// ============================================================================

/**
 * 保存游戏成绩
 * @param {Object} scoreData - 成绩数据
 */
async function saveScore(scoreData) {
    try {
        const user = await getCurrentUser();
        if (!user) {
            throw new Error('用户未登录');
        }
        
        const { data, error } = await supabase
            .from('scores')
            .insert([{
                user_id: user.id,
                midi_name: scoreData.midiName,
                score: scoreData.score,
                accuracy: scoreData.accuracy,
                combo: scoreData.combo,
                notes_triggered: scoreData.notesTriggered,
                total_notes: scoreData.totalNotes,
                speed_multiplier: scoreData.speedMultiplier || 1.0,
                created_at: new Date().toISOString()
            }]);
        
        if (error) throw error;
        
        console.log('✅ 成绩保存成功:', data);
        return { success: true, data };
    } catch (error) {
        console.error('❌ 成绩保存失败:', error);
        return { success: false, error: error.message };
    }
}

/**
 * 获取用户历史成绩
 * @param {number} limit - 返回数量限制
 */
async function getUserScores(limit = 10) {
    try {
        const user = await getCurrentUser();
        if (!user) {
            throw new Error('用户未登录');
        }
        
        const { data, error } = await supabase
            .from('scores')
            .select('*')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false })
            .limit(limit);
        
        if (error) throw error;
        
        return { success: true, scores: data };
    } catch (error) {
        console.error('❌ 获取历史成绩失败:', error);
        return { success: false, error: error.message };
    }
}

/**
 * 获取用户最佳成绩（按歌曲分组）
 */
async function getUserBestScores() {
    try {
        const user = await getCurrentUser();
        if (!user) {
            throw new Error('用户未登录');
        }
        
        const { data, error } = await supabase
            .from('scores')
            .select('*')
            .eq('user_id', user.id)
            .order('score', { ascending: false });
        
        if (error) throw error;
        
        // 按歌曲分组，取每首歌的最高分
        const bestScores = {};
        data.forEach(score => {
            if (!bestScores[score.midi_name] || score.score > bestScores[score.midi_name].score) {
                bestScores[score.midi_name] = score;
            }
        });
        
        return { success: true, scores: Object.values(bestScores) };
    } catch (error) {
        console.error('❌ 获取最佳成绩失败:', error);
        return { success: false, error: error.message };
    }
}

/**
 * 获取全球排行榜
 * @param {string} midiName - 歌曲名称（可选）
 * @param {number} limit - 返回数量限制
 */
async function getLeaderboard(midiName = null, limit = 100) {
    try {
        let query = supabase
            .from('scores')
            .select('*, users:user_id(username, email)')
            .order('score', { ascending: false })
            .limit(limit);
        
        if (midiName) {
            query = query.eq('midi_name', midiName);
        }
        
        const { data, error } = await query;
        
        if (error) throw error;
        
        return { success: true, leaderboard: data };
    } catch (error) {
        console.error('❌ 获取排行榜失败:', error);
        return { success: false, error: error.message };
    }
}

/**
 * 获取用户统计数据
 */
async function getUserStats() {
    try {
        const user = await getCurrentUser();
        if (!user) {
            throw new Error('用户未登录');
        }
        
        const { data, error } = await supabase
            .from('scores')
            .select('*')
            .eq('user_id', user.id);
        
        if (error) throw error;
        
        // 计算统计数据
        const stats = {
            totalGames: data.length,
            totalScore: data.reduce((sum, s) => sum + s.score, 0),
            averageAccuracy: data.reduce((sum, s) => sum + s.accuracy, 0) / data.length || 0,
            maxCombo: Math.max(...data.map(s => s.combo), 0),
            bestScore: Math.max(...data.map(s => s.score), 0),
            uniqueSongs: new Set(data.map(s => s.midi_name)).size
        };
        
        return { success: true, stats };
    } catch (error) {
        console.error('❌ 获取统计数据失败:', error);
        return { success: false, error: error.message };
    }
}

/**
 * 更新用户资料
 * @param {Object} updates - 更新的字段
 */
async function updateUserProfile(updates) {
    try {
        const user = await getCurrentUser();
        if (!user) {
            throw new Error('用户未登录');
        }
        
        const { data, error } = await supabase.auth.updateUser({
            data: updates
        });
        
        if (error) throw error;
        
        console.log('✅ 用户资料更新成功:', data);
        return { success: true, user: data.user };
    } catch (error) {
        console.error('❌ 用户资料更新失败:', error);
        return { success: false, error: error.message };
    }
}
