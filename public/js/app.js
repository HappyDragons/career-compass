// ===== 求职罗盘 - 应用逻辑（全栈版） =====
(function () {
  'use strict';

  // === STATE ===
  var currentUser = null;
  var token = localStorage.getItem('cc_token');
  var selectedJob = null;
  var currentSkillJob = null;
  var currentInterviewJob = null;
  var skillScores = {};

  document.addEventListener('DOMContentLoaded', init);

  // === API HELPER ===
  function api(method, path, body) {
    var opts = { method: method, headers: { 'Content-Type': 'application/json' } };
    if (token) opts.headers['Authorization'] = 'Bearer ' + token;
    if (body) opts.body = JSON.stringify(body);
    return fetch('/api' + path, opts).then(function (r) {
      return r.json().then(function (data) {
        if (!r.ok) throw new Error(data.error || '请求失败');
        return data;
      });
    });
  }

  function isLoggedIn() { return !!currentUser; }

  // === XSS PROTECTION ===
  function esc(str) {
    if (!str) return '';
    var div = document.createElement('div');
    div.appendChild(document.createTextNode(str));
    return div.innerHTML;
  }

  // === INIT ===
  function init() {
    bindTabs();
    bindAuth();
    bindHistoryTabs();
    renderJobSelector('jd-jobs', onJobSelectedJD);
    renderJobSelector('skill-jobs', onJobSelectedSkill);
    renderJobSelector('plan-jobs', onJobSelectedPlan);
    renderJobSelector('interview-jobs', onJobSelectedInterview);
    bindJDParse();
    bindResumeForm();
    bindProfileForm();
    bindSkillSave();

    // Populate profile job dropdown
    var sel = document.getElementById('profile-job');
    if (sel) {
      getAllJobs().forEach(function (j) {
        var o = document.createElement('option');
        o.value = j.id;
        o.textContent = j.title;
        sel.appendChild(o);
      });
    }

    // Check existing token
    if (token) {
      api('GET', '/auth/me').then(function (data) {
        currentUser = data.user;
        updateUserUI();
        loadDashboard();
        loadProfile();
      }).catch(function () {
        token = null;
        localStorage.removeItem('cc_token');
        updateUserUI();
      });
    } else {
      updateUserUI();
    }
  }

  // === AUTH ===
  var authMode = 'login'; // 'login' or 'register'

  function bindAuth() {
    var modal = document.getElementById('auth-modal');
    var form = document.getElementById('auth-form');
    var switchLink = document.getElementById('auth-switch-link');
    var skipLink = document.getElementById('auth-skip-link');
    var loginBtn = document.getElementById('login-btn');
    var logoutBtn = document.getElementById('logout-btn');

    loginBtn.addEventListener('click', function () {
      authMode = 'login';
      updateAuthModal();
      modal.classList.add('visible');
    });

    logoutBtn.addEventListener('click', function () {
      token = null;
      currentUser = null;
      localStorage.removeItem('cc_token');
      updateUserUI();
      // Switch to JD tab
      switchToTab('sec-jd');
    });

    switchLink.addEventListener('click', function (e) {
      e.preventDefault();
      authMode = authMode === 'login' ? 'register' : 'login';
      updateAuthModal();
    });

    skipLink.addEventListener('click', function (e) {
      e.preventDefault();
      modal.classList.remove('visible');
      switchToTab('sec-jd');
    });

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var errEl = document.getElementById('auth-error');
      var username = document.getElementById('auth-username').value.trim();
      var password = document.getElementById('auth-password').value.trim();
      var email = document.getElementById('auth-email').value.trim();
      errEl.textContent = '';

      if (authMode === 'register' && !email) {
        errEl.textContent = '请填写邮箱';
        return;
      }

      var endpoint = authMode === 'login' ? '/auth/login' : '/auth/register';
      var body = { username: username, password: password };
      if (authMode === 'register') body.email = email;

      var btn = document.getElementById('auth-submit-btn');
      btn.disabled = true;
      btn.textContent = '处理中...';

      api('POST', endpoint, body).then(function (data) {
        token = data.token;
        currentUser = data.user;
        localStorage.setItem('cc_token', token);
        modal.classList.remove('visible');
        updateUserUI();
        loadDashboard();
        loadProfile();
        form.reset();
      }).catch(function (err) {
        errEl.textContent = err.message;
      }).finally(function () {
        btn.disabled = false;
        btn.textContent = authMode === 'login' ? '登录' : '注册';
      });
    });

    // Show modal on first visit if not logged in
    if (!token) {
      setTimeout(function () { modal.classList.add('visible'); }, 500);
    }
  }

  function updateAuthModal() {
    var isLogin = authMode === 'login';
    document.getElementById('auth-title').textContent = isLogin ? '登录' : '注册';
    document.getElementById('auth-email-group').style.display = isLogin ? 'none' : 'block';
    document.getElementById('auth-submit-btn').textContent = isLogin ? '登录' : '注册';
    document.getElementById('auth-switch-text').textContent = isLogin ? '没有账号？' : '已有账号？';
    document.getElementById('auth-switch-link').textContent = isLogin ? '立即注册' : '去登录';
    document.getElementById('auth-error').textContent = '';
  }

  function updateUserUI() {
    var loginBtn = document.getElementById('login-btn');
    var logoutBtn = document.getElementById('logout-btn');
    var userDisplay = document.getElementById('user-display');
    var userName = document.getElementById('user-name');
    var userAvatar = document.getElementById('user-avatar');

    if (isLoggedIn()) {
      loginBtn.style.display = 'none';
      logoutBtn.style.display = '';
      userDisplay.style.display = '';
      userName.textContent = currentUser.username;
      userAvatar.textContent = currentUser.username.charAt(0).toUpperCase();

      // Show logged-in sections
      document.getElementById('dashboard-login-hint').style.display = 'none';
      document.getElementById('dashboard-content').style.display = 'block';
      document.getElementById('profile-login-hint').style.display = 'none';
      document.getElementById('profile-form-wrap').style.display = 'block';
      document.getElementById('history-login-hint').style.display = 'none';
      document.getElementById('history-content').style.display = 'block';
      document.getElementById('skill-save-btn').style.display = '';
    } else {
      loginBtn.style.display = '';
      logoutBtn.style.display = 'none';
      userDisplay.style.display = 'none';

      document.getElementById('dashboard-login-hint').style.display = '';
      document.getElementById('dashboard-content').style.display = 'none';
      document.getElementById('profile-login-hint').style.display = '';
      document.getElementById('profile-form-wrap').style.display = 'none';
      document.getElementById('history-login-hint').style.display = '';
      document.getElementById('history-content').style.display = 'none';
      document.getElementById('skill-save-btn').style.display = 'none';
    }
  }

  // === TAB NAVIGATION ===
  function bindTabs() {
    var tabs = document.querySelectorAll('.nav__tab');
    tabs.forEach(function (tab) {
      tab.addEventListener('click', function () {
        var target = this.dataset.tab;
        switchToTab(target);
      });
    });
  }

  function switchToTab(tabId) {
    var tabs = document.querySelectorAll('.nav__tab');
    tabs.forEach(function (t) { t.classList.remove('active'); });
    var activeTab = document.querySelector('.nav__tab[data-tab="' + tabId + '"]');
    if (activeTab) activeTab.classList.add('active');
    document.querySelectorAll('.section').forEach(function (s) { s.classList.remove('active'); });
    document.getElementById(tabId).classList.add('active');

    // Load data when switching to certain tabs
    if (tabId === 'sec-dashboard' && isLoggedIn()) loadDashboard();
    if (tabId === 'sec-history' && isLoggedIn()) loadHistory();
  }

  // === HISTORY TABS ===
  function bindHistoryTabs() {
    document.querySelectorAll('.history-tab').forEach(function (tab) {
      tab.addEventListener('click', function () {
        document.querySelectorAll('.history-tab').forEach(function (t) {
          t.classList.remove('active');
          t.classList.remove('btn--primary');
          t.classList.add('btn--outline');
        });
        this.classList.add('active');
        this.classList.remove('btn--outline');
        this.classList.add('btn--primary');
        document.querySelectorAll('.history-panel').forEach(function (p) { p.classList.remove('active'); });
        document.getElementById(this.dataset.htab).classList.add('active');
      });
    });
  }

  // === JOB SELECTOR ===
  function renderJobSelector(containerId, onSelect) {
    var container = document.getElementById(containerId);
    if (!container) return;
    var jobs = getAllJobs();
    jobs.forEach(function (job) {
      var card = document.createElement('div');
      card.className = 'job-card';
      card.dataset.jobId = job.id;
      card.innerHTML =
        '<div class="job-card__cat">' + job.category + '</div>' +
        '<div class="job-card__title">' + job.title + '</div>' +
        '<div class="job-card__salary">' + job.salaryRange + '</div>';
      card.addEventListener('click', function () {
        container.querySelectorAll('.job-card').forEach(function (c) { c.classList.remove('selected'); });
        card.classList.add('selected');
        onSelect(job);
      });
      container.appendChild(card);
    });
  }

  // === MODULE 1: JD TRANSLATOR ===
  function bindJDParse() {
    var btn = document.getElementById('jd-parse-btn');
    if (!btn) return;
    btn.addEventListener('click', function () {
      var textarea = document.getElementById('jd-input');
      var text = textarea.value.trim();
      var resultEl = document.getElementById('jd-result');
      if (!text && !selectedJob) {
        resultEl.innerHTML = '<p style="color:var(--danger)">请先粘贴招聘描述或选择一个岗位</p>';
        return;
      }
      if (selectedJob) {
        renderJDResult(selectedJob, text);
      } else {
        renderJDFromText(text);
      }
    });
  }

  function onJobSelectedJD(job) {
    selectedJob = job;
    document.getElementById('jd-input').placeholder = '已选择「' + job.title + '」，可直接点击翻译，或粘贴具体JD获取更详细分析';
  }

  function renderJDResult(job, extraText) {
    var el = document.getElementById('jd-result');
    var keywords = extractKeywords(extraText);
    var extra = keywords.length > 0 ? '<div class="result__block"><div class="result__label">JD关键词提取</div><div class="result__text">' + keywords.map(function (k) { return '<span style="display:inline-block;background:var(--primary-light);padding:2px 8px;border-radius:4px;margin:2px;font-size:0.85rem">' + k + '</span>'; }).join('') + '</div></div>' : '';

    el.innerHTML =
      '<div class="result__block"><div class="result__label">你实际要干什么</div><div class="result__text">' + job.realWork + '</div></div>' +
      '<div class="result__block"><div class="result__label">真正需要的核心能力</div><div class="result__text">' + job.skills.map(function (s, i) { return '<span style="display:inline-block;background:' + (i < 3 ? '#fef3c7' : '#f1f5f9') + ';padding:3px 10px;border-radius:4px;margin:3px;font-size:0.9rem;font-weight:' + (i < 3 ? '600' : '400') + '">' + s + (i < 3 ? ' ⭐' : '') + '</span>'; }).join('') + '</div></div>' +
      '<div class="result__block"><div class="result__label">薪资参考</div><div class="result__text" style="font-size:1.1rem;font-weight:600;color:var(--success)">' + job.salaryRange + '</div></div>' +
      '<div class="result__block"><div class="result__label">求职建议</div><div class="result__text">这个岗位最看重<strong>前3项核心技能</strong>（标⭐的），建议优先在简历和面试中体现这些能力。应届生不需要全部精通，但至少要有1-2个拿得出手的项目经验。</div></div>' +
      extra;
  }

  function renderJDFromText(text) {
    var el = document.getElementById('jd-result');
    var keywords = extractKeywords(text);
    var hasExp = /(\d+)年/.test(text);
    var salary = text.match(/(\d+)[kK]-(\d+)[kK]/) || text.match(/(\d+)-(\d+)/);

    el.innerHTML =
      '<div class="result__block"><div class="result__label">关键词提取</div><div class="result__text">' +
      (keywords.length > 0 ? keywords.map(function (k) { return '<span style="display:inline-block;background:var(--primary-light);padding:2px 8px;border-radius:4px;margin:2px;font-size:0.85rem">' + k + '</span>'; }).join('') : '未检测到明确技能关键词') +
      '</div></div>' +
      '<div class="result__block"><div class="result__label">经验要求</div><div class="result__text">' +
      (hasExp ? '⚠️ 该岗位要求工作经验，应届生可通过实习经历弥补' : '✅ 未发现硬性经验要求，应届生友好') +
      '</div></div>' +
      (salary ? '<div class="result__block"><div class="result__label">薪资信息</div><div class="result__text" style="color:var(--success);font-weight:600">' + salary[0] + '</div></div>' : '') +
      '<div class="result__block"><div class="result__label">建议</div><div class="result__text">💡 建议选择上方的标准岗位获取更详细的分析。直接粘贴JD仅能做关键词级别的解读。</div></div>';
  }

  function extractKeywords(text) {
    if (!text) return [];
    var kwList = ['Python', 'Java', 'JavaScript', 'React', 'Vue', 'Node', 'SQL', 'MySQL', 'Redis', 'Spring', 'Docker', 'Linux', 'Git', 'HTML', 'CSS', 'TypeScript', 'Go', 'C\\+\\+', 'Figma', 'Sketch', 'Axure', 'Photoshop', 'Excel', 'Tableau', 'SPSS', 'R语言', '机器学习', '深度学习', 'TensorFlow', 'PyTorch', '数据分析', '产品设计', '用户研究', '项目管理', '市场营销', '内容运营', '数据运营', '用户运营', '新媒体', '文案', 'SEO', 'SEM', '团队管理', '沟通能力', '英语', 'CET-4', 'CET-6', '雅思', '托福'];
    var found = [];
    kwList.forEach(function (kw) {
      var re = new RegExp(kw, 'i');
      if (re.test(text)) found.push(kw.replace('\\+', '+'));
    });
    return found;
  }

  // === MODULE 2: SKILL GAP ANALYZER ===
  function onJobSelectedSkill(job) {
    currentSkillJob = job;
    var panel = document.getElementById('skill-panel');
    panel.style.display = 'block';
    skillScores = {};
    var required = {};
    job.skills.forEach(function (s, i) { required[s] = Math.max(90 - i * 10, 50); });

    // Try to load last saved scores
    if (isLoggedIn()) {
      api('GET', '/skill/latest/' + job.id).then(function (data) {
        if (data.record && data.record.scores) {
          Object.keys(data.record.scores).forEach(function (k) {
            skillScores[k] = data.record.scores[k];
          });
        }
        renderSkillSliders(job, required);
      }).catch(function () {
        renderSkillSliders(job, required);
      });
    } else {
      renderSkillSliders(job, required);
    }
  }

  function renderSkillSliders(job, required) {
    var controlsHtml = '';
    job.skills.forEach(function (skill) {
      var val = skillScores[skill] || 50;
      skillScores[skill] = val;
      controlsHtml +=
        '<div class="skill-slider">' +
        '<div class="skill-slider__label"><span>' + skill + '</span><span id="score-' + skill.replace(/[\/\s\(\)]/g, '_') + '">' + val + '</span></div>' +
        '<input type="range" min="0" max="100" value="' + val + '" data-skill="' + skill + '" class="skill-range">' +
        '<div class="skill-gap" id="gap-' + skill.replace(/[\/\s\(\)]/g, '_') + '"></div>' +
        '</div>';
    });
    document.getElementById('skill-controls').innerHTML = controlsHtml;

    document.querySelectorAll('.skill-range').forEach(function (slider) {
      slider.addEventListener('input', function () {
        var skill = this.dataset.skill;
        var val = parseInt(this.value);
        skillScores[skill] = val;
        var safeId = skill.replace(/[\/\s\(\)]/g, '_');
        document.getElementById('score-' + safeId).textContent = val;
        var req = required[skill] || 70;
        var gapEl = document.getElementById('gap-' + safeId);
        if (val >= req) {
          gapEl.className = 'skill-gap skill-gap--good';
          gapEl.textContent = '✓ 达标（需要' + req + '分）';
        } else if (val >= req - 20) {
          gapEl.className = 'skill-gap skill-gap--warn';
          gapEl.textContent = '⚠ 接近（差' + (req - val) + '分，需要' + req + '分）';
        } else {
          gapEl.className = 'skill-gap skill-gap--bad';
          gapEl.textContent = '✗ 差距较大（差' + (req - val) + '分，需要' + req + '分）';
        }
        drawRadar(job.skills, skillScores, required);
      });
    });

    drawRadar(job.skills, skillScores, required);
    document.querySelectorAll('.skill-range').forEach(function (s) { s.dispatchEvent(new Event('input')); });
  }

  function bindSkillSave() {
    var btn = document.getElementById('skill-save-btn');
    if (!btn) return;
    btn.addEventListener('click', function () {
      if (!isLoggedIn() || !currentSkillJob) return;
      var msg = document.getElementById('skill-save-msg');
      btn.disabled = true;

      var gapSummary = '';
      var required = {};
      currentSkillJob.skills.forEach(function (s, i) { required[s] = Math.max(90 - i * 10, 50); });
      currentSkillJob.skills.forEach(function (s) {
        var diff = (skillScores[s] || 50) - (required[s] || 70);
        gapSummary += s + ':' + (diff >= 0 ? '+' : '') + diff + '; ';
      });

      api('POST', '/skill', {
        job_id: currentSkillJob.id,
        job_title: currentSkillJob.title,
        scores: skillScores,
        gap_summary: gapSummary
      }).then(function () {
        msg.textContent = '✅ 已保存';
        msg.style.color = 'var(--success)';
        setTimeout(function () { msg.textContent = ''; }, 2000);
      }).catch(function (err) {
        msg.textContent = '保存失败：' + err.message;
        msg.style.color = 'var(--danger)';
      }).finally(function () {
        btn.disabled = false;
      });
    });
  }

  function drawRadar(skills, scores, required) {
    var canvas = document.getElementById('radar-canvas');
    if (!canvas) return;
    var ctx = canvas.getContext('2d');
    var W = canvas.width, H = canvas.height;
    var cx = W / 2, cy = H / 2, R = Math.min(W, H) / 2 - 50;
    ctx.clearRect(0, 0, W, H);

    var n = skills.length;
    var step = (2 * Math.PI) / n;

    [0.2, 0.4, 0.6, 0.8, 1.0].forEach(function (ratio) {
      ctx.beginPath();
      for (var i = 0; i <= n; i++) {
        var a = i * step - Math.PI / 2;
        var x = cx + R * ratio * Math.cos(a);
        var y = cy + R * ratio * Math.sin(a);
        if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.closePath();
      ctx.strokeStyle = '#e2e8f0';
      ctx.lineWidth = 1;
      ctx.stroke();
    });

    ctx.font = '12px "Noto Sans SC", sans-serif';
    ctx.fillStyle = '#64748b';
    ctx.textAlign = 'center';
    for (var i = 0; i < n; i++) {
      var a = i * step - Math.PI / 2;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(cx + R * Math.cos(a), cy + R * Math.sin(a));
      ctx.strokeStyle = '#e2e8f0';
      ctx.stroke();
      var lx = cx + (R + 30) * Math.cos(a);
      var ly = cy + (R + 30) * Math.sin(a);
      ctx.fillText(skills[i], lx, ly + 4);
    }

    ctx.beginPath();
    for (var i = 0; i <= n; i++) {
      var idx = i % n;
      var a = idx * step - Math.PI / 2;
      var r = (required[skills[idx]] || 70) / 100 * R;
      var x = cx + r * Math.cos(a);
      var y = cy + r * Math.sin(a);
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.strokeStyle = '#94a3b8';
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 5]);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = 'rgba(148,163,184,0.08)';
    ctx.fill();

    ctx.beginPath();
    for (var i = 0; i <= n; i++) {
      var idx = i % n;
      var a = idx * step - Math.PI / 2;
      var r = (scores[skills[idx]] || 0) / 100 * R;
      var x = cx + r * Math.cos(a);
      var y = cy + r * Math.sin(a);
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.strokeStyle = '#2563eb';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = 'rgba(37,99,235,0.15)';
    ctx.fill();

    ctx.fillStyle = '#2563eb';
    ctx.fillRect(20, H - 30, 16, 3);
    ctx.fillStyle = '#1e293b';
    ctx.font = '11px "Noto Sans SC"';
    ctx.textAlign = 'left';
    ctx.fillText('你的水平', 42, H - 26);
    ctx.strokeStyle = '#94a3b8';
    ctx.setLineDash([5, 5]);
    ctx.beginPath(); ctx.moveTo(120, H - 28); ctx.lineTo(136, H - 28); ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillText('岗位要求', 142, H - 26);
  }

  // === MODULE 3: ACTION PLAN ===
  function onJobSelectedPlan(job) {
    var el = document.getElementById('plan-content');
    el.style.display = 'block';
    var html = '<h3 style="margin-bottom:1rem;font-size:1.1rem">' + job.title + ' · 成长路线图</h3><div class="timeline">';
    job.plan.forEach(function (p) {
      html += '<div class="timeline__item">' +
        '<div class="timeline__dot"></div>' +
        '<div class="timeline__stage">' + p.stage + '</div>' +
        '<div class="timeline__duration">建议周期：' + p.duration + '</div>' +
        '<ul class="timeline__tasks">' +
        p.tasks.map(function (t) { return '<li>' + t + '</li>'; }).join('') +
        '</ul></div>';
    });
    html += '</div>';
    el.innerHTML = html;
  }

  // === MODULE 4: MOCK INTERVIEW ===
  function onJobSelectedInterview(job) {
    currentInterviewJob = job;
    var el = document.getElementById('interview-content');
    el.style.display = 'block';
    var html = '<h3 style="margin-bottom:1rem">' + job.title + ' · 常见面试题</h3>';
    job.interviewQs.forEach(function (item, i) {
      var uid = 'iq-' + i;
      html += '<div class="interview-card">' +
        '<div class="interview-card__q" data-target="' + uid + '">Q' + (i + 1) + '. ' + item.q + ' <span class="interview-card__arrow" id="arrow-' + uid + '">▼</span></div>' +
        '<div class="interview-card__a" id="' + uid + '">' +
        '<div class="interview-card__tips">💡 答题思路：' + item.tips + '</div>' +
        '<div class="interview-card__input">' +
        '<textarea placeholder="在这里练习你的回答..." id="ans-' + uid + '"></textarea>' +
        '<button class="btn btn--sm btn--outline" style="margin-top:0.5rem" onclick="checkAnswer(\'' + uid + '\',' + i + ')">检查我的回答</button>' +
        '<div id="fb-' + uid + '"></div>' +
        '</div></div></div>';
    });
    el.innerHTML = html;

    document.querySelectorAll('.interview-card__q').forEach(function (q) {
      q.addEventListener('click', function () {
        var target = this.dataset.target;
        var el = document.getElementById(target);
        var arrow = document.getElementById('arrow-' + target);
        el.classList.toggle('open');
        arrow.classList.toggle('open');
      });
    });
  }

  window.checkAnswer = function (uid, qIndex) {
    var ans = document.getElementById('ans-' + uid).value.trim();
    var fb = document.getElementById('fb-' + uid);
    if (!ans) {
      fb.innerHTML = '<div class="interview-card__feedback interview-card__feedback--improve">请先写下你的回答再检查</div>';
      return;
    }
    var len = ans.length;
    var hasNumbers = /\d/.test(ans);
    var hasStar = /(背景|任务|行动|结果|情境|做了|负责|通过|实现|达成|提升|降低)/.test(ans);

    var feedback = [];
    var score = 60;
    if (len < 50) { feedback.push('回答偏短，建议补充更多细节（当前' + len + '字，建议100字以上）'); score -= 20; }
    if (len > 300) { feedback.push('篇幅合适，注意面试时控制在2分钟内'); score += 5; }
    if (!hasNumbers) { feedback.push('建议加入具体数据（如提升了XX%、服务了XX用户）'); score -= 10; }
    if (!hasStar) { feedback.push('建议用STAR法则组织：情境→任务→行动→结果'); score -= 10; }
    if (hasNumbers && hasStar && len >= 50) { feedback.push('结构和内容都不错，继续打磨表达的流畅度'); score = 85; }
    if (hasNumbers && hasStar && len >= 100) score = 95;
    score = Math.max(20, Math.min(100, score));

    var isGood = hasNumbers && hasStar && len >= 50;
    fb.innerHTML = '<div class="interview-card__feedback ' + (isGood ? 'interview-card__feedback--good' : 'interview-card__feedback--improve') + '">' +
      '<strong>得分：' + score + '/100</strong><br>' +
      feedback.map(function (f) { return '• ' + f; }).join('<br>') + '</div>';

    // Save to backend if logged in
    if (isLoggedIn() && currentInterviewJob) {
      var qText = currentInterviewJob.interviewQs[qIndex] ? currentInterviewJob.interviewQs[qIndex].q : '';
      api('POST', '/interview', {
        job_id: currentInterviewJob.id,
        job_title: currentInterviewJob.title,
        question_index: qIndex,
        question_text: qText,
        answer: ans,
        feedback: feedback.join('; '),
        score: score
      }).catch(function () { /* silent */ });
    }
  };

  // === MODULE 5: RESUME HELPER ===
  function bindResumeForm() {
    var btn = document.getElementById('resume-gen-btn');
    if (!btn) return;
    btn.addEventListener('click', function () {
      var type = document.getElementById('resume-type').value;
      var situation = document.getElementById('resume-situation').value.trim();
      var task = document.getElementById('resume-task').value.trim();
      var action = document.getElementById('resume-action').value.trim();
      var result = document.getElementById('resume-result').value.trim();
      var output = document.getElementById('resume-output');

      if (!situation || !task || !action || !result) {
        output.innerHTML = '<p style="color:var(--danger)">请填写完整四个字段</p>';
        return;
      }

      var verbs = ACTION_VERBS[type] || ACTION_VERBS.general;
      var v1 = verbs[Math.floor(Math.random() * verbs.length)];
      var v2 = verbs[Math.floor(Math.random() * verbs.length)];

      var bullets = [
        v1 + esc(situation) + '项目中的' + esc(task) + '工作，' + esc(action) + '，最终' + esc(result),
        '在' + esc(situation) + '中' + v1 + esc(task) + '，通过' + esc(action) + '，' + esc(result),
        v2 + esc(task) + '（' + esc(situation) + '），采用' + esc(action) + '的方式，达成' + esc(result) + '的效果'
      ];

      output.innerHTML = '<div class="resume-output"><p style="font-weight:600;margin-bottom:0.5rem">STAR法则优化后的简历表述：</p>' +
        bullets.map(function (b, i) {
          return '<div class="resume-output__item">方案' + (i + 1) + '：' + b + '</div>';
        }).join('') +
        '<div class="resume-output__copy" onclick="copyResume()">📋 点击复制全部</div>' +
        (isLoggedIn() ? '<div class="resume-output__copy" onclick="saveResume()" id="save-resume-link" style="color:var(--primary)">💾 保存到我的记录</div>' : '') +
        '</div>';

      // Store for saving
      window._lastResume = { type: type, situation: situation, task: task, action: action, result: result, bullets: bullets };
    });
  }

  window.copyResume = function () {
    var items = document.querySelectorAll('.resume-output__item');
    var text = Array.from(items).map(function (el) { return el.textContent; }).join('\n');
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(onCopied).catch(fallbackCopy);
    } else {
      fallbackCopy();
    }
    function onCopied() {
      var el = document.querySelector('.resume-output__copy');
      el.textContent = '✅ 已复制到剪贴板';
      setTimeout(function () { el.textContent = '📋 点击复制全部'; }, 2000);
    }
    function fallbackCopy() {
      var ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      try { document.execCommand('copy'); onCopied(); } catch (e) { alert('复制失败，请手动复制'); }
      document.body.removeChild(ta);
    }
  };

  window.saveResume = function () {
    if (!isLoggedIn() || !window._lastResume) return;
    var r = window._lastResume;
    var link = document.getElementById('save-resume-link');
    api('POST', '/resume', {
      type: r.type,
      situation: r.situation,
      task: r.task,
      action: r.action,
      result: r.result,
      generated_texts: r.bullets
    }).then(function () {
      if (link) { link.textContent = '✅ 已保存'; link.onclick = null; }
    }).catch(function (err) {
      if (link) { link.textContent = '保存失败：' + err.message; }
    });
  };

  // === PROFILE ===
  function bindProfileForm() {
    var btn = document.getElementById('profile-save-btn');
    if (!btn) return;
    btn.addEventListener('click', function () {
      if (!isLoggedIn()) return;
      var msg = document.getElementById('profile-msg');
      btn.disabled = true;
      api('PUT', '/profile', {
        target_job: document.getElementById('profile-job').value,
        university: document.getElementById('profile-university').value.trim(),
        major: document.getElementById('profile-major').value.trim(),
        grade: document.getElementById('profile-grade').value,
        bio: document.getElementById('profile-bio').value.trim()
      }).then(function () {
        msg.textContent = '✅ 保存成功';
        msg.style.color = 'var(--success)';
        setTimeout(function () { msg.textContent = ''; }, 2000);
      }).catch(function (err) {
        msg.textContent = '保存失败：' + err.message;
        msg.style.color = 'var(--danger)';
      }).finally(function () {
        btn.disabled = false;
      });
    });
  }

  function loadProfile() {
    if (!isLoggedIn()) return;
    api('GET', '/profile').then(function (data) {
      var p = data.profile;
      if (!p) return;
      if (p.target_job) document.getElementById('profile-job').value = p.target_job;
      if (p.university) document.getElementById('profile-university').value = p.university;
      if (p.major) document.getElementById('profile-major').value = p.major;
      if (p.grade) document.getElementById('profile-grade').value = p.grade;
      if (p.bio) document.getElementById('profile-bio').value = p.bio;
    }).catch(function () { /* silent */ });
  }

  // === DASHBOARD ===
  function loadDashboard() {
    if (!isLoggedIn()) return;
    api('GET', '/stats').then(function (data) {
      var o = data.overview;
      document.getElementById('stat-skills').textContent = o.skillCount;
      document.getElementById('stat-interviews').textContent = o.interviewCount;
      document.getElementById('stat-resumes').textContent = o.resumeCount;
      document.getElementById('stat-jobs').textContent = o.jobsExplored;

      // Recent activity
      var actEl = document.getElementById('recent-activity');
      if (data.recentActivity && data.recentActivity.length > 0) {
        actEl.innerHTML = data.recentActivity.map(function (a) {
          var time = a.created_at ? new Date(a.created_at + 'Z').toLocaleDateString('zh-CN') : '';
          return '<div class="activity-item">' +
            '<span class="activity-item__badge">' + a.type + '</span>' +
            '<span class="activity-item__text">' + a.title + '</span>' +
            '<span class="activity-item__time">' + time + '</span>' +
            '</div>';
        }).join('');
      } else {
        actEl.innerHTML = '<p style="color:var(--text-secondary);font-size:0.9rem">暂无记录，开始使用各模块后这里会显示你的活动</p>';
      }

      // Skill overview
      var skillEl = document.getElementById('skill-overview');
      if (data.skillHistory && data.skillHistory.length > 0) {
        skillEl.innerHTML = data.skillHistory.map(function (s) {
          var avg = 0;
          var cnt = 0;
          Object.values(s.scores).forEach(function (v) { avg += v; cnt++; });
          avg = cnt > 0 ? Math.round(avg / cnt) : 0;
          return '<div class="history-item"><div class="history-item__info">' +
            '<div class="history-item__title">' + s.job_title + '</div>' +
            '<div class="history-item__meta">平均分：' + avg + ' · ' + new Date(s.created_at + 'Z').toLocaleDateString('zh-CN') + '</div>' +
            '</div></div>';
        }).join('');
      } else {
        skillEl.innerHTML = '<p style="color:var(--text-secondary);font-size:0.9rem">完成技能评估后这里会显示各岗位的最新评分</p>';
      }
    }).catch(function () { /* silent */ });
  }

  // === HISTORY ===
  function loadHistory() {
    if (!isLoggedIn()) return;
    // Load all three types in parallel
    api('GET', '/skill').then(function (data) {
      var el = document.getElementById('history-skills-list');
      if (data.records && data.records.length > 0) {
        el.innerHTML = data.records.map(function (r) {
          var avg = 0, cnt = 0;
          Object.values(r.scores).forEach(function (v) { avg += v; cnt++; });
          avg = cnt > 0 ? Math.round(avg / cnt) : 0;
          return '<div class="history-item"><div class="history-item__info">' +
            '<div class="history-item__title">' + esc(r.job_title) + ' · 平均 ' + avg + '分</div>' +
            '<div class="history-item__meta">' + new Date(r.created_at + 'Z').toLocaleString('zh-CN') + '</div>' +
            '</div><div class="history-item__actions">' +
            '<button class="btn btn--sm btn--outline" onclick="deleteSkill(' + r.id + ')">删除</button>' +
            '</div></div>';
        }).join('');
      } else {
        el.innerHTML = '<p style="color:var(--text-secondary);font-size:0.9rem;padding:1rem 0">暂无记录</p>';
      }
    }).catch(function () {});

    api('GET', '/interview').then(function (data) {
      var el = document.getElementById('history-interviews-list');
      if (data.records && data.records.length > 0) {
        el.innerHTML = data.records.map(function (r) {
          return '<div class="history-item"><div class="history-item__info">' +
            '<div class="history-item__title">' + esc(r.job_title) + ' · Q: ' + esc((r.question_text || '').substring(0, 30)) + '...</div>' +
            '<div class="history-item__meta">得分：' + r.score + '/100 · ' + new Date(r.created_at + 'Z').toLocaleString('zh-CN') + '</div>' +
            '</div><div class="history-item__actions">' +
            '<button class="btn btn--sm btn--outline" onclick="deleteInterview(' + r.id + ')">删除</button>' +
            '</div></div>';
        }).join('');
      } else {
        el.innerHTML = '<p style="color:var(--text-secondary);font-size:0.9rem;padding:1rem 0">暂无记录</p>';
      }
    }).catch(function () {});

    api('GET', '/resume').then(function (data) {
      var el = document.getElementById('history-resumes-list');
      if (data.records && data.records.length > 0) {
        el.innerHTML = data.records.map(function (r) {
          return '<div class="history-item"><div class="history-item__info">' +
            '<div class="history-item__title">' + esc(r.type) + ' · ' + esc(r.situation.substring(0, 20)) + '...</div>' +
            '<div class="history-item__meta">' + new Date(r.created_at + 'Z').toLocaleString('zh-CN') + '</div>' +
            '</div><div class="history-item__actions">' +
            '<button class="btn btn--sm btn--outline" onclick="deleteResume(' + r.id + ')">删除</button>' +
            '</div></div>';
        }).join('');
      } else {
        el.innerHTML = '<p style="color:var(--text-secondary);font-size:0.9rem;padding:1rem 0">暂无记录</p>';
      }
    }).catch(function () {});
  }

  window.deleteSkill = function (id) {
    if (!confirm('确定删除这条记录？')) return;
    api('DELETE', '/skill/' + id).then(function () { loadHistory(); }).catch(function () {});
  };

  window.deleteInterview = function (id) {
    if (!confirm('确定删除这条记录？')) return;
    api('DELETE', '/interview/' + id).then(function () { loadHistory(); }).catch(function () {});
  };

  window.deleteResume = function (id) {
    if (!confirm('确定删除这条记录？')) return;
    api('DELETE', '/resume/' + id).then(function () { loadHistory(); }).catch(function () {});
  };

})();
