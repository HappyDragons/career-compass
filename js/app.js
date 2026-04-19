// ===== 求职罗盘 - 应用逻辑 =====
(function () {
  'use strict';

  let selectedJob = null;
  let skillScores = {};

  document.addEventListener('DOMContentLoaded', init);

  function init() {
    bindTabs();
    renderJobSelector('jd-jobs', onJobSelectedJD);
    renderJobSelector('skill-jobs', onJobSelectedSkill);
    renderJobSelector('plan-jobs', onJobSelectedPlan);
    renderJobSelector('interview-jobs', onJobSelectedInterview);
    bindJDParse();
    bindResumeForm();
  }

  // === TAB NAVIGATION ===
  function bindTabs() {
    var tabs = document.querySelectorAll('.nav__tab');
    tabs.forEach(function (tab) {
      tab.addEventListener('click', function () {
        var target = this.dataset.tab;
        tabs.forEach(function (t) { t.classList.remove('active'); });
        this.classList.add('active');
        document.querySelectorAll('.section').forEach(function (s) { s.classList.remove('active'); });
        document.getElementById(target).classList.add('active');
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
    var salary = text.match(/(\d+)[kK]-(\d+)[kK]/) || text.match(/(\d+)-(\d+)/) ;

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
    var panel = document.getElementById('skill-panel');
    panel.style.display = 'block';
    skillScores = {};
    var required = {};
    job.skills.forEach(function (s, i) { required[s] = Math.max(90 - i * 10, 50); });

    var controlsHtml = '';
    job.skills.forEach(function (skill) {
      skillScores[skill] = 50;
      controlsHtml +=
        '<div class="skill-slider">' +
        '<div class="skill-slider__label"><span>' + skill + '</span><span id="score-' + skill.replace(/[\/\s\(\)]/g, '_') + '">50</span></div>' +
        '<input type="range" min="0" max="100" value="50" data-skill="' + skill + '" class="skill-range">' +
        '<div class="skill-gap" id="gap-' + skill.replace(/[\/\s\(\)]/g, '_') + '"></div>' +
        '</div>';
    });
    document.getElementById('skill-controls').innerHTML = controlsHtml;

    // Bind sliders
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
    // trigger initial gap display
    document.querySelectorAll('.skill-range').forEach(function (s) { s.dispatchEvent(new Event('input')); });
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

    // Grid
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

    // Axes + labels
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

    // Required polygon
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

    // User polygon
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

    // Legend
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
        '<button class="btn btn--sm btn--outline" style="margin-top:0.5rem" onclick="checkAnswer(\'' + uid + '\')">检查我的回答</button>' +
        '<div id="fb-' + uid + '"></div>' +
        '</div></div></div>';
    });
    el.innerHTML = html;

    // Bind accordion
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

  // Global function for inline onclick
  window.checkAnswer = function (uid) {
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
    if (len < 50) feedback.push('回答偏短，建议补充更多细节（当前' + len + '字，建议100字以上）');
    if (len > 300) feedback.push('篇幅合适，注意面试时控制在2分钟内');
    if (!hasNumbers) feedback.push('建议加入具体数据（如提升了XX%、服务了XX用户）');
    if (!hasStar) feedback.push('建议用STAR法则组织：情境→任务→行动→结果');
    if (hasNumbers && hasStar && len >= 50) feedback.push('结构和内容都不错，继续打磨表达的流畅度');

    var isGood = hasNumbers && hasStar && len >= 50;
    fb.innerHTML = '<div class="interview-card__feedback ' + (isGood ? 'interview-card__feedback--good' : 'interview-card__feedback--improve') + '">' +
      feedback.map(function (f) { return '• ' + f; }).join('<br>') + '</div>';
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
        v1 + situation + '项目中的' + task + '工作，' + action + '，最终' + result,
        '在' + situation + '中' + v1 + task + '，通过' + action + '，' + result,
        v2 + task + '（' + situation + '），采用' + action + '的方式，达成' + result + '的效果'
      ];

      output.innerHTML = '<div class="resume-output"><p style="font-weight:600;margin-bottom:0.5rem">STAR法则优化后的简历表述：</p>' +
        bullets.map(function (b, i) {
          return '<div class="resume-output__item">方案' + (i + 1) + '：' + b + '</div>';
        }).join('') +
        '<div class="resume-output__copy" onclick="copyResume()">📋 点击复制全部</div></div>';
    });
  }

  window.copyResume = function () {
    var items = document.querySelectorAll('.resume-output__item');
    var text = Array.from(items).map(function (el) { return el.textContent; }).join('\n');
    navigator.clipboard.writeText(text).then(function () {
      var el = document.querySelector('.resume-output__copy');
      el.textContent = '✅ 已复制到剪贴板';
      setTimeout(function () { el.textContent = '📋 点击复制全部'; }, 2000);
    });
  };

})();
