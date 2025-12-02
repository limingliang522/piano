// Supabase 配置和 API 封装
const SUPABASE_CONFIG = {
    url: 'https://odoiplbvwmrfkozkomzq.supabase.co',
    anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9kb2lwbGJ2d21yZmtvemtvbXpxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ2NDIzNjAsImV4cCI6MjA4MDIxODM2MH0.QUI1iIiLSAHZ9M9xA3QUX65nQHoPG-t_07K1vDy0cfk'
};

let supabase = null;

// 初始化 Supabase
function initSupabase() {
    if (!window.supabase) {
        console.error('Supabase SDK 未加载');
        return false;
    }
    if (SUPABASE_CONFIG.url === 'YOUR_SUPABASE_URL') {
        console.warn('请先配置 Supabase URL 和 API Key');
        return false;
    }
    try {
        supabase = window.supabase.createClient(SUPABASE_CONFIG.url, SUPABASE_CONFIG.anonKey);
        return true;
    } catch (error) {
        console.error('Supabase 初始化失败:', error);
        return false;
    }
}

// ============================================================================
// 用户认证 API
// ============================================================================

async function checkUsernameExists(username) {
    try {
        const { data, error } = await supabase.rpc('check_username_exists', { username_to_check: username });
        if (error) return false;
        return data === true;
    } catch (error) {
        return false;
    }
}

async function signUp(email, password, username) {
    try {
        const usernameExists = await checkUsernameExists(username);
        if (usernameExists) {
            throw new Error('用户名已被使用，请选择其他用户名');
        }
        const { data, error } = await supabase.auth.signUp({
            email, password,
            options: { data: { username }, emailRedirectTo: window.location.origin }
        });
        if (error) throw error;
        // 初始化拼图碎片（失败不影响注册）
        if (data.user && data.session) {
            try { await updatePuzzlePieces(25); } catch (e) { /* 忽略初始化错误 */ }
        }
        return { success: true, user: data.user, session: data.session };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

async function signIn(email, password) {
    try {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        return { success: true, user: data.user };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

async function signOut() {
    try {
        const { error } = await supabase.auth.signOut();
        if (error) throw error;
        return { success: true };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

async function getCurrentUser() {
    try {
        const { data: { user }, error } = await supabase.auth.getUser();
        if (error) throw error;
        return user;
    } catch (error) {
        return null;
    }
}

function onAuthStateChange(callback) {
    supabase.auth.onAuthStateChange((event, session) => {
        callback(event, session);
    });
}

// ============================================================================
// 游戏数据 API
// ============================================================================

async function saveScore(scoreData) {
    try {
        const user = await getCurrentUser();
        if (!user) throw new Error('用户未登录');
        const { data, error } = await supabase.from('scores').insert([{
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
        return { success: true, data };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

async function getUserScores(limit = 10) {
    try {
        const user = await getCurrentUser();
        if (!user) throw new Error('用户未登录');
        const { data, error } = await supabase.from('scores')
            .select('*').eq('user_id', user.id)
            .order('created_at', { ascending: false }).limit(limit);
        if (error) throw error;
        return { success: true, scores: data };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

async function getUserBestScores() {
    try {
        const user = await getCurrentUser();
        if (!user) throw new Error('用户未登录');
        const { data, error } = await supabase.from('scores')
            .select('*').eq('user_id', user.id).order('score', { ascending: false });
        if (error) throw error;
        const bestScores = {};
        data.forEach(score => {
            if (!bestScores[score.midi_name] || score.score > bestScores[score.midi_name].score) {
                bestScores[score.midi_name] = score;
            }
        });
        return { success: true, scores: Object.values(bestScores) };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

async function getLeaderboard(midiName = null, limit = 100) {
    try {
        let query = supabase.from('scores')
            .select('*, users:user_id(username, email)')
            .order('score', { ascending: false }).limit(limit);
        if (midiName) query = query.eq('midi_name', midiName);
        const { data, error } = await query;
        if (error) throw error;
        return { success: true, leaderboard: data };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

async function getUserStats() {
    try {
        const user = await getCurrentUser();
        if (!user) throw new Error('用户未登录');
        const { data, error } = await supabase.from('scores').select('*').eq('user_id', user.id);
        if (error) throw error;
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
        return { success: false, error: error.message };
    }
}

async function updateUserProfile(updates) {
    try {
        const user = await getCurrentUser();
        if (!user) throw new Error('用户未登录');
        if (updates.username) {
            const usernameExists = await checkUsernameExists(updates.username);
            if (usernameExists) throw new Error('用户名已被使用，请选择其他用户名');
        }
        const { data, error } = await supabase.auth.updateUser({ data: updates });
        if (error) throw error;
        return { success: true, user: data.user };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

async function deleteAccount() {
    try {
        const user = await getCurrentUser();
        if (!user) throw new Error('用户未登录');
        const { data, error } = await supabase.rpc('delete_user_account');
        if (error) throw error;
        localStorage.removeItem('unlockedMusic');
        localStorage.removeItem('puzzlePieces');
        await signOut();
        return { success: true, message: '账号已完全删除' };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

// ============================================================================
// 音乐解锁系统 API
// ============================================================================

async function getUnlockedMusic() {
    try {
        const user = await getCurrentUser();
        if (!user) return { success: true, music: [] };
        const { data, error } = await supabase.from('unlocked_music')
            .select('midi_name').eq('user_id', user.id);
        if (error) throw error;
        return { success: true, music: data.map(item => item.midi_name) };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

async function unlockMusic(midiName) {
    try {
        const user = await getCurrentUser();
        if (!user) return { success: false, error: '请先登录' };
        const { error } = await supabase.from('unlocked_music').insert([{
            user_id: user.id,
            midi_name: midiName,
            unlocked_at: new Date().toISOString()
        }]);
        if (error && error.code !== '23505') throw error;
        return { success: true };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

async function initNewUserMusic(allMusic) {
    try {
        if (allMusic.length === 0) return { success: false, error: '没有可用的音乐' };
        const randomIndex = Math.floor(Math.random() * allMusic.length);
        const selected = [allMusic[randomIndex]];
        for (const music of selected) await unlockMusic(music);
        return { success: true, unlocked: selected };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

async function getPuzzlePieces() {
    try {
        const user = await getCurrentUser();
        if (!user) return { success: true, count: 0 };
        const { data, error } = await supabase.from('user_inventory')
            .select('puzzle_pieces').eq('user_id', user.id).single();
        if (error && error.code !== 'PGRST116') throw error;
        return { success: true, count: data ? data.puzzle_pieces : 0 };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

async function updatePuzzlePieces(count) {
    try {
        const user = await getCurrentUser();
        if (!user) return { success: false, error: '请先登录' };
        const { error } = await supabase.from('user_inventory').upsert({
            user_id: user.id,
            puzzle_pieces: count,
            updated_at: new Date().toISOString()
        });
        if (error) throw error;
        return { success: true };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

// ============================================================================
// 云端数据同步 API
// ============================================================================

async function getUserCompleteData() {
    try {
        const user = await getCurrentUser();
        if (!user) return { success: false, error: '用户未登录' };
        const [settingsResult, inventoryResult, musicResult, statsResult] = await Promise.all([
            getUserSettings(), getPuzzlePieces(), getUnlockedMusic(), getUserStats()
        ]);
        return {
            success: true,
            data: {
                settings: settingsResult.success ? settingsResult.settings : null,
                inventory: inventoryResult.success ? { puzzlePieces: inventoryResult.count } : null,
                unlockedMusic: musicResult.success ? musicResult.music : [],
                stats: statsResult.success ? statsResult.stats : null
            }
        };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

async function getUserSettings() {
    try {
        const user = await getCurrentUser();
        if (!user) return { success: false, error: '用户未登录' };
        const { data, error } = await supabase.from('user_settings')
            .select('*').eq('user_id', user.id).single();
        if (error && error.code !== 'PGRST116') throw error;
        if (!data) {
            return {
                success: true,
                settings: {
                    volume: 100, quality_level: 'high', auto_quality_adjust: true,
                    post_processing_enabled: true, bloom_intensity: 0.5, last_selected_music: null
                }
            };
        }
        return { success: true, settings: data };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

async function saveUserSettings(settings) {
    try {
        const user = await getCurrentUser();
        if (!user) return { success: false, error: '用户未登录' };
        const { error } = await supabase.from('user_settings').upsert({
            user_id: user.id,
            volume: settings.volume,
            quality_level: settings.quality_level,
            auto_quality_adjust: settings.auto_quality_adjust,
            post_processing_enabled: settings.post_processing_enabled,
            bloom_intensity: settings.bloom_intensity,
            last_selected_music: settings.last_selected_music,
            updated_at: new Date().toISOString()
        });
        if (error) throw error;
        return { success: true };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

async function syncAllDataToCloud(allData) {
    try {
        const user = await getCurrentUser();
        if (!user) return { success: false, error: '用户未登录' };
        const results = await Promise.all([
            allData.settings ? saveUserSettings(allData.settings) : Promise.resolve({ success: true }),
            allData.inventory ? updatePuzzlePieces(allData.inventory.puzzlePieces) : Promise.resolve({ success: true })
        ]);
        return results.every(r => r.success) ? { success: true } : { success: false, error: '部分数据同步失败' };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

async function loadAllDataFromCloud() {
    try {
        const result = await getUserCompleteData();
        if (!result.success) throw new Error(result.error);
        localStorage.removeItem('unlockedMusic');
        localStorage.removeItem('puzzlePieces');
        localStorage.removeItem('userSettings');
        return { success: true, data: result.data };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

function clearAllLocalData() {
    localStorage.removeItem('unlockedMusic');
    localStorage.removeItem('puzzlePieces');
    localStorage.removeItem('userSettings');
}
