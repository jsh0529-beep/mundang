/* ═══════════════════════════════════════════════════════════
   명문각 明問閣 — 통합 서버 (사주 4단 + 해몽)
   [설치]
   1) 프로젝트 설정(왼쪽 톱니) → 스크립트 속성 → 속성 추가
      속성: ANTHROPIC_KEY / 값: 본인 API 키  ← 코드에 키를 두지 않습니다
   2) 저장 → 함수 'setup' 선택 → 실행 (권한 승인)
   3) 서비스(+)에서 Drive API 추가
   4) 배포 → 새 배포 → 웹 앱 → 액세스 '모든 사용자' → URL 복사
   5) saju.html · dream.html 상단 SERVER_URL에 붙여넣기
   ═══════════════════════════════════════════════════════════ */

const SECRET = 'mundang';
const VERSION = 'mg-v2';

function getApiKey(){
  const k = PropertiesService.getScriptProperties().getProperty('ANTHROPIC_KEY');
  if (!k) throw new Error('스크립트 속성에 ANTHROPIC_KEY가 없습니다 — 프로젝트 설정 → 스크립트 속성에서 추가하세요');
  return k;
}

/* 상품별 모델 — 원가 조절은 여기 한 줄씩만 */
const MODELS = {
  teaser: 'claude-haiku-4-5-20251001',
  dream : 'claude-haiku-4-5-20251001',
  lite  : 'claude-sonnet-4-6',
  deep  : 'claude-sonnet-4-6',
  full  : 'claude-opus-4-8'
};

const EL_COLOR = {'목':'#3E7C4F','화':'#B23A32','토':'#B8862B','금':'#6E6E76','수':'#31566E'};

/* ═══════════ 페르소나 ═══════════ */
const PERSONA = `당신은 명리학 경력 30년의 간명가 '청안(淸眼) 선생'입니다. 명문각(明問閣)의 주인입니다. 문체 원칙:
- 정중한 존댓말이되 문장은 현대적으로 짧고 단정합니다. 군더더기 수식과 상투적 위로를 걷어냅니다.
- 부드럽지만 단호합니다. 짚을 것은 분명히 짚고, 근거 없는 말은 한 줄도 쓰지 않습니다.
- 좋은 점만 나열하지 않습니다. 매 장마다 이 사주의 약한 고리, 조심할 시기, 경계할 습성을 최소 한 가지 이상 분명히 언급하되, 반드시 대비책과 함께 말합니다. 공포를 조장하거나 흉사를 단정하지 않습니다.
- 명문각의 신조는 "답을 주지 않습니다. 물음을 정리해 드립니다."입니다. 단정 대신 "이 원국은 ~을 묻고 있습니다", "선택은 두 갈래입니다" 같은 화법을 씁니다. 다만 물음만 던지고 끝내지 않고, 선생으로서의 판단과 권고는 분명히 제시합니다.
- 마크다운 기호(별표, 샵)를 절대 쓰지 않습니다. 소제목은 【소제목】 형식으로만 씁니다.
- 지장간(支藏干)을 반드시 활용합니다. 제공된 데이터에는 각 지지의 지장간이 여기(餘氣)·중기(中氣)·정기(正氣) 층별로 날수와 함께 들어 있습니다. 매 장마다 최소 한 번은 지장간을 근거로 "겉과 속이 다른 지점"을 짚습니다. 언급 시 한자와 한글을 함께 적습니다. 예: 술(戌) 안에는 신(辛) 9일, 정(丁) 3일, 무(戊) 18일이 숨어 있으니…
- 오행 세력은 제공된 elementPower(지장간 날수 가중 백분율)를 근거로 말합니다. 겉글자 개수(elements)와 세력이 다르면 그 차이 자체를 해석 포인트로 씁니다.
- 절대 규칙: 아래 제공된 만세력 데이터의 간지·오행·십성·지장간·대운을 그대로 사용하고, 스스로 다시 계산하거나 바꾸지 않습니다. 데이터에 없는 간지를 지어내지 않습니다.`;

/* ═══════════ 사주 장 구성 (티어별) ═══════════ */
const S_GIJIL = {t:'원국 총평과 타고난 기질', p:'첫 장입니다. ① 신청자께 드리는 정중하고 간결한 첫인사(2~3문장) ② 원국 전체를 한눈에 짚는 총평 ③ 일간을 중심으로 타고난 성정과 기질, 장점과 함께 이 기질이 지나칠 때 생기는 그림자까지. 특히 일지·월지의 지장간을 층별로 풀어 겉으로 보이는 성정과 속에 감춘 기질의 차이를 짚습니다. 소제목 2~3개, 전체 1700~2100자.'};
const S_JAEMUL = {t:'오행의 균형, 그리고 직업과 재물', p:'① elementPower 기준 오행 세력의 과다·부족이 삶에서 어떻게 드러나는지(겉글자 개수와 세력이 다르면 반드시 그 차이를 해석) ② 십성 구조로 본 직업 적성과 일하는 방식, 맞는 길과 피해야 할 길 ③ 재물운의 그릇, 돈이 들어오는 방식과 새는 구멍(반드시 새는 구멍도 언급) ④ 천간에 없고 지장간에만 숨은 십성이 있다면 "아직 드러나지 않은 재물·직업의 씨앗"으로 반드시 해석합니다. 소제목 2~3개, 전체 1700~2100자.'};
const S_AEJEONG = {t:'애정과 건강, 곁에 두는 사람들', p:'① 애정·혼인운: 인연의 모양과 관계에서 반복될 수 있는 패턴(좋은 것과 조심할 것 모두). 배우자궁인 일지(日支)의 지장간을 층별로 반드시 풀어 배우자의 성향과 관계의 속내를 짚습니다 ② 건강운: 오행 세력상 약한 장부와 나이 들며 살펴야 할 부분(의학적 단정은 피하고 양생의 관점으로) ③ 대인관계: 귀인의 결과 멀리할 인연의 결. 소제목 3개, 전체 1700~2100자.'};
const S_DAEUN = {t:'대운의 흐름과 올해, 그리고 당부', p:'① 대운 흐름을 시기별로 짚으며 인생의 큰 물줄기 설명(좋은 대운과 견뎌야 할 대운 모두). 대운·세운의 천간이 원국 지장간과 같은 글자로 들어올 때는 투출 발현 시기이므로 반드시 짚습니다 ② 올해 세운 풀이와 상반기·하반기 조언 ③ 개운 처방: 방위, 색, 마음가짐 등 실천 가능한 것 위주 ④ 맺음말: 선생으로서의 당부와 서명(명문각 청안 드림). 소제목 3개, 전체 1900~2300자.'};

const SEC_LITE = [
  S_GIJIL,
  {t:'재물·직업·애정의 큰 결, 그리고 올해', p:'간단 간명의 마지막 장입니다. ① 오행 세력(elementPower)과 십성 구조로 본 재물운의 그릇과 돈이 새는 구멍 ② 직업 적성의 핵심과 피해야 할 길 ③ 애정·혼인운의 큰 결(좋은 것과 조심할 것 모두, 일지 지장간 근거) ④ 올해 세운 풀이와 상반기·하반기 조언 ⑤ 짧은 개운 처방과 맺음말, 서명(명문각 청안 드림). 소제목 3~4개, 전체 2000~2400자.'}
];
const SEC_DEEP = [ S_GIJIL, S_JAEMUL, S_AEJEONG, S_DAEUN ];
const SEC_FULL = [
  S_GIJIL,
  {t:'지장간 전수 해부 — 여덟 글자 속의 속사정', p:'정밀 간명 전용 장입니다. 연·월·일·시 네 지지의 지장간을 여기·중기·정기 층별로 하나도 빠짐없이 풉니다. 각 층이 이 사람의 삶 어느 국면(초년의 잔재, 감춰진 씨앗, 본령)에서 어떻게 발현되는지, 천간에 투출된 글자와 묻힌 글자를 구분해 "드러난 나"와 "감춘 나"의 지도를 그립니다. 날수가 짧은 중기일수록 뜻밖의 국면에서 튀어나오는 기운으로 해석합니다. 소제목 3~4개, 전체 2100~2500자.'},
  S_JAEMUL, S_AEJEONG,
  {t:'육십 년의 물줄기 — 대운 전체를 걷다', p:'제공된 대운 여덟 개를 처음부터 끝까지 하나씩 짚습니다. 각 대운의 십 년이 이 원국에 무엇을 가져오고 무엇을 앗아가는지, 기회의 대운과 견딜 대운을 구분하고, 대운 천간이 원국 지장간과 만나 투출되는 시기는 반드시 강조합니다. 지나온 대운은 짧게 확인하듯, 다가올 대운은 전략으로 깁니다. 맺음말은 쓰지 않습니다. 소제목 3개, 전체 2100~2500자.'},
  {t:'올해의 세운과 열두 달의 흐름', p:'① 올해 세운이 이 원국에 만드는 국면을 깊게 풉니다 ② 상반기·하반기로 나누어 크게 짚은 뒤, 계절별(봄·여름·가을·겨울)로 조심할 것과 붙잡을 것을 구체적으로 제시합니다 ③ 특히 관심 분야(focus)가 있으면 그 영역의 올해 흐름을 별도 소제목으로 다룹니다. 맺음말은 쓰지 않습니다. 소제목 3개, 전체 1900~2300자.'},
  {t:'여쭈신 질문에 대한 답, 그리고 당부', p:'제공된 질문이 있으면 각 질문에 사주 근거를 들어 정면으로 답합니다(최대 3개, 질문별 소제목). 질문이 없으면 이 원국이 스스로 묻고 있는 가장 중요한 물음을 선생이 세워 답합니다. ② 개운 처방(방위·색·마음가짐) ③ 마지막에 선생으로서의 당부와 서명(명문각 청안 드림). 전체 2000~2400자.'}
];
function getSecSet(d){
  if (d && d.tier === 'lite') return SEC_LITE;
  if (d && d.tier === 'full') return SEC_FULL;
  return SEC_DEEP;
}
function tierLabel(d){
  if (d && d.type === 'dream') return '해몽';
  if (d && d.tier === 'lite') return '간단 간명';
  if (d && d.tier === 'full') return '정밀 간명';
  return '심층 간명';
}
function tierModel(d){
  if (d && d.type === 'dream') return MODELS.dream;
  if (d && d.tier === 'lite') return MODELS.lite;
  if (d && d.tier === 'full') return MODELS.full;
  return MODELS.deep;
}

/* ═══════════ 해몽 ═══════════ */
const DREAM_SYS = `당신은 명문각(明問閣)의 간명가 '청안(淸眼) 선생'입니다. 전통 해몽 이론(주공해몽·동양 상징 체계)에 밝은 30년 경력자입니다. 문체 원칙:
- 정중한 존댓말, 짧고 단정한 현대적 문장. 마크다운 기호 금지, 소제목은 【소제목】 형식만.
- 꿈을 미신적 길흉 판정으로 끝내지 않고, 상징을 골라내어 지금 이 사람의 물음과 잇습니다.
- 구성: 【첫 풀이】 꿈 전체의 핵심 의미 3~5문장 → 【상징 하나하나】 꿈에 등장한 상징 3~6개를 골라 각각의 전통적 의미와 이 꿈 맥락에서의 뜻 → 【길흉의 결과 시기】 이 꿈이 가리키는 방향과 대략의 시기감(단정 금지, 결로 말하기) → 【당부】 지금 조심할 것 한 가지와 붙잡을 것 한 가지, 서명(명문각 청안 드림).
- 생년월일이 제공되면 일간의 오행을 참고해 풀이를 그 사람에게 맞추되, 만세력을 새로 계산하지는 않습니다.
- 불안을 부추기지 않습니다. 흉몽도 반드시 대비책과 함께, 예지몽 단정 금지. 전체 1300~1700자.`;

/* ═══════════ 기반 함수 ═══════════ */
function setup() {
  getSheet();
  ScriptApp.getProjectTriggers().forEach(function(t){ ScriptApp.deleteTrigger(t); });
  ScriptApp.newTrigger('processQueue').timeBased().everyMinutes(1).create();
}
function getSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sh = ss.getSheetByName('접수');
  if (!sh) {
    sh = ss.insertSheet('접수');
    sh.appendRow(['ID','시각','서비스','상품','금액','이름','이메일','상태','DATA','REPORT','AUTO']);
  }
  return sh;
}
function out(o){ return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON); }
function findRow(sh, id){
  const v = sh.getDataRange().getValues();
  for (let i = 1; i < v.length; i++) if (String(v[i][0]) === String(id)) return i + 1;
  return -1;
}
function callAnthropic(sys, user, model){
  const res = UrlFetchApp.fetch('https://api.anthropic.com/v1/messages', {
    method:'post', contentType:'application/json',
    headers:{'x-api-key':getApiKey(),'anthropic-version':'2023-06-01'},
    muteHttpExceptions:true,
    payload:JSON.stringify({model:model||MODELS.deep, max_tokens:4000, system:sys,
      messages:[{role:'user',content:user}]})
  });
  const code = res.getResponseCode(), body = res.getContentText();
  if (code !== 200) throw new Error('API ' + code + ': ' + body.slice(0,160));
  const j = JSON.parse(body);
  return j.content.filter(function(c){return c.type==='text';}).map(function(c){return c.text;}).join('\n');
}
function personObj(c){
  return {이름:c.name, 성별:c.gender, 출생:c.solarBirth, 음력:c.lunarText, 시간모름:c.timeUnknown,
    자시기준:c.jasi, 일간:c.dayMaster, 원국:c.pillars, 오행겉개수:c.elements,
    오행세력백분율:c.elementPower, 대운:c.daYun, 올해세운:c.thisYear};
}
function buildDataBlock(d){
  const o = personObj(d); o['관심분야'] = d.focus; o['질문'] = d.question;
  return '[만세력 데이터 — 이 값만 사용할 것. 원국 각 지지의 hidden3 배열이 지장간이며 순서대로 여기·(중기)·정기, days는 날수임]\n'
    + JSON.stringify(o, null, 1);
}

/* ═══════════ 무료 티저 ═══════════ */
function makeTeaser(d){
  const sys = `당신은 명문각(明問閣)의 간명가 '청안(淸眼) 선생'입니다. 명리학 경력 30년. 지금은 무료 맛보기 "첫 물음"을 씁니다. 원칙:
- 5~7문장, 400자 이내. 존댓말, 마크다운 금지, 소제목 없이 한 호흡의 글.
- 반드시 원국의 실제 글자(일간·월지·지장간 중 눈에 띄는 것 하나)를 근거로 이 사람만의 구체적 특징 한 가지, 그리고 겉과 속이 다른 지점 한 가지를 짚습니다. 누구에게나 맞는 말(바넘 문장) 금지.
- 시기를 하나 언급합니다(올해 세운 또는 현재 대운 근거). 단정이 아니라 "~한 국면입니다" 화법.
- 마지막 문장은 반드시 물음으로 끝냅니다. 이 원국이 본인에게 묻고 있는 가장 아픈 질문 하나. 답은 주지 않습니다.
- 제공된 만세력 데이터만 사용하고 재계산하지 않습니다.`;
  return callAnthropic(sys, buildDataBlock(d) + '\n\n첫 물음을 쓰세요. 본문만 출력합니다.', MODELS.teaser);
}

/* ═══════════ 간명서 DOCX ═══════════ */
function esc(s){
  return String(s == null ? '' : s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}
function meishikHtml(c){
  const order = c.timeUnknown ? ['day','month','year'] : ['time','day','month','year'];
  const labels = {time:'시주', day:'일주', month:'월주', year:'연주'};
  const P = c.pillars || {};
  let head='', ganRow='', jiRow='', hidRow='';
  order.forEach(function(k){
    const p = P[k] || {};
    head += '<td style="border:1pt solid #B7A87F;background:#EFE7D3;text-align:center;padding:6pt;font-size:9pt">' + esc(labels[k]) + '</td>';
    ganRow += '<td style="border:1pt solid #B7A87F;text-align:center;padding:8pt">' +
      '<span style="font-size:8pt;color:#6E6350">' + esc(p.ssGan) + '</span><br>' +
      '<span style="font-size:24pt;color:' + (EL_COLOR[p.ganEl]||'#26221A') + '">' + esc(p.gan) + '</span><br>' +
      '<span style="font-size:9pt">' + esc(p.ganKo) + '·' + esc(p.ganEl) + '</span></td>';
    jiRow += '<td style="border:1pt solid #B7A87F;text-align:center;padding:8pt">' +
      '<span style="font-size:24pt;color:' + (EL_COLOR[p.jiEl]||'#26221A') + '">' + esc(p.ji) + '</span><br>' +
      '<span style="font-size:9pt">' + esc(p.jiKo) + '·' + esc(p.jiEl) + '</span><br>' +
      '<span style="font-size:8pt;color:#6E6350">' + esc(p.ssJi) + '</span></td>';
    const h3 = (p.hidden3||[]).map(function(h){return esc(h.gan)+'('+esc(h.ko)+')'+h.days+'일';}).join(' · ');
    hidRow += '<td style="border:1pt solid #B7A87F;text-align:center;padding:5pt;font-size:8pt;color:#6E6350">' + h3 + '</td>';
  });
  const pw = c.elementPower || {};
  const pwLine = ['목','화','토','금','수'].map(function(e){return e + ' ' + (pw[e]!=null?pw[e]:'-') + '%';}).join(' 　');
  return '<h1>命式 　사주 원국</h1>' +
    '<p style="font-size:9.5pt;color:#6E6350;text-indent:0">' + esc(c.name) + ' (' + esc(c.gender) + ') · ' + esc(c.solarBirth) + ' · ' + esc(c.lunarText) + '</p>' +
    '<table style="border-collapse:collapse;width:100%"><tr>' + head + '</tr><tr>' + ganRow + '</tr><tr>' + jiRow + '</tr><tr>' + hidRow + '</tr></table>' +
    '<p style="font-size:9pt;color:#6E6350;text-indent:0;margin-top:8pt">오행 세력(지장간 날수 가중) 　' + pwLine + '</p>';
}
function buildDoc(d, secs){
  const set = getSecSet(d);
  const NUM = '一二三四五六七八';
  let secHtml = '';
  (secs||[]).forEach(function(t,i){
    secHtml += '<div style="page-break-before:always"></div>';
    secHtml += '<h1>第' + (NUM[i]||(i+1)) + '章 　' + esc(set[i]?set[i].t:'') + '</h1>';
    String(t).split('\n').forEach(function(l){
      l = l.trim(); if(!l) return;
      const m = l.match(/^【(.+?)】$/);
      if (m) secHtml += '<h2>【' + esc(m[1]) + '】</h2>';
      else secHtml += '<p>' + esc(l) + '</p>';
    });
  });
  const dstr = Utilities.formatDate(new Date(),'Asia/Seoul','yyyy년 M월 d일');
  const coverWho = esc(d.name) + ' 님 (' + esc(d.gender) + ')';
  const coverMeta = esc(d.solarBirth) + '<br>' + esc(d.lunarText) +
    (d.corrected ? '<br>진태양시 보정 적용' : '') +
    (d.timeUnknown ? '<br>출생 시각 미상 — 시주 제외 간명' : '');
  const docName = '간명서_' + d.name;
  const html =
'<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40">' +
'<head><meta charset="utf-8"><title>간명서</title>' +
'<!--[if gte mso 9]><xml><w:WordDocument><w:View>Print</w:View><w:Zoom>100</w:Zoom></w:WordDocument></xml><![endif]-->' +
'<style>' +
'@page{size:A4;margin:2.5cm 2.2cm}' +
'body{font-family:"바탕","Batang",serif;font-size:11pt;line-height:1.9;color:#26221A}' +
'h1{font-size:15pt;letter-spacing:4pt;margin:0 0 16pt;color:#5A4A22;font-weight:normal;border-bottom:1pt solid #B7A87F;padding-bottom:8pt}' +
'h2{font-size:12pt;margin:18pt 0 8pt;color:#5A4A22}' +
'p{margin:0 0 10pt;text-align:justify;text-indent:10pt}' +
'.cover{text-align:center}' +
'.small{font-size:8.5pt;color:#8A7E66}' +
'</style></head><body>' +
'<div class="cover">' +
'<p style="font-size:26pt;letter-spacing:14pt;margin-top:90pt">看 命 書</p>' +
'<p style="font-size:12pt;letter-spacing:6pt;color:#8A7E66;margin-top:8pt">명문각 · 明問閣</p>' +
'<p style="font-size:10pt;color:#8A7E66;margin-top:6pt">' + esc(tierLabel(d)) + '</p>' +
'<p style="font-size:14pt;margin-top:50pt">' + coverWho + '</p>' +
'<p style="font-size:10pt;color:#6E6350;line-height:2">' + coverMeta + '</p>' +
'<p style="font-size:10pt;color:#6E6350;line-height:2;margin-top:60pt">간명일 　' + dstr + '<br>간명 　청안 선생</p>' +
'<p style="font-size:9pt;color:#8A7E66;margin-top:30pt;letter-spacing:1pt">답을 주지 않습니다. 물음을 정리해 드립니다.</p>' +
'</div>' +
'<div style="page-break-before:always"></div>' + meishikHtml(d) +
'<p class="small">본 명식은 절기(節氣) 기준 만세력으로 산출되었으며, 지장간은 여기·중기·정기 층별 날수 배분을 따랐습니다.</p>' +
secHtml +
'<div style="page-break-before:always"></div>' +
'<p style="text-align:center;margin-top:60pt;letter-spacing:3pt">明問閣 　청안 드림</p>' +
'<p class="small" style="text-align:center;margin-top:30pt">본 간명서는 전통 명리학 이론에 근거하여 작성된 참고 자료입니다.<br>중요한 결정은 여러 조언과 함께 신중히 내리시기 바랍니다.</p>' +
'</body></html>';

  const base = docName + '_' + Utilities.formatDate(new Date(),'Asia/Seoul','yyyyMMdd');
  const htmlBlob = Utilities.newBlob(html,'text/html',base + '.html');
  let gdocId = null;
  try {
    let created;
    try {
      created = Drive.Files.create({name:'tmp_'+base, mimeType:'application/vnd.google-apps.document'}, htmlBlob);
    } catch (e3) {
      created = Drive.Files.insert({title:'tmp_'+base, mimeType:'application/vnd.google-apps.document'}, htmlBlob, {convert:true});
    }
    gdocId = created.id || created.getId();
    const url = 'https://docs.google.com/feeds/download/documents/export/Export?id=' + gdocId + '&exportFormat=docx';
    const res = UrlFetchApp.fetch(url, {headers:{Authorization:'Bearer '+ScriptApp.getOAuthToken()}, muteHttpExceptions:true});
    if (res.getResponseCode() !== 200)
      throw new Error('docx export ' + res.getResponseCode() + ': ' + res.getContentText().slice(0,100));
    const o = res.getBlob()
      .setContentType('application/vnd.openxmlformats-officedocument.wordprocessingml.document')
      .setName(base + '.docx');
    try { DriveApp.getFileById(gdocId).setTrashed(true); } catch(e){}
    return o;
  } catch (err) {
    try { if (gdocId) DriveApp.getFileById(gdocId).setTrashed(true); } catch(e){}
    throw new Error('docx 변환 실패 — ' + String(err).slice(0,180));
  }
}

/* ═══════════ 발송 ═══════════ */
function sendSajuReport(d, secs, email){
  const doc = buildDoc(d, secs);
  MailApp.sendEmail({
    to: email,
    subject: '[명문각] ' + d.name + ' 님의 ' + tierLabel(d) + ' 간명서를 보내드립니다',
    htmlBody:
      '<div style="font-family:serif;line-height:1.9;color:#26221A">' +
      '<p>' + esc(d.name) + ' 님, 안녕하세요. 명문각입니다.</p>' +
      '<p>여쭈신 원국을 정성껏 살펴 적은 간명서를 문서 파일로 첨부해 드립니다.<br>' +
      '천천히 읽어보시고, 궁금하신 점은 이 메일로 회신 주세요.</p>' +
      '<p>답을 드리기보다, 물음을 정리해 드리려 했습니다.<br>明問閣 청안 드림</p>' +
      '<p style="font-size:12px;color:#8A7E66">본 간명서는 전통 명리학 이론에 근거한 참고 자료입니다.</p></div>',
    attachments: [doc],
    name: '명문각'
  });
}
function sendDreamReport(d, text, email){
  let body = '<div style="font-family:serif;line-height:2;color:#26221A;max-width:620px">' +
    '<p style="text-align:center;font-size:20px;letter-spacing:8px;margin:26px 0 4px">解 夢 書</p>' +
    '<p style="text-align:center;font-size:12px;letter-spacing:4px;color:#8A7E66;margin:0 0 26px">명문각 · 明問閣</p>' +
    '<p style="font-size:13px;color:#6E6350">' + esc(d.name) + ' 님께 　·　' +
    Utilities.formatDate(new Date(),'Asia/Seoul','yyyy년 M월 d일') + '</p><hr style="border:none;border-top:1px solid #B7A87F">';
  String(text).split('\n').forEach(function(l){
    l = l.trim(); if(!l) return;
    const m = l.match(/^【(.+?)】$/);
    if (m) body += '<p style="font-size:15px;color:#5A4A22;margin:22px 0 6px">【' + esc(m[1]) + '】</p>';
    else body += '<p style="font-size:14px;margin:0 0 10px">' + esc(l) + '</p>';
  });
  body += '<hr style="border:none;border-top:1px solid #B7A87F">' +
    '<p style="font-size:11px;color:#8A7E66">본 해몽은 전통 해몽 이론에 근거한 참고 자료입니다.</p></div>';
  MailApp.sendEmail({
    to: email,
    subject: '[명문각] ' + d.name + ' 님의 해몽서를 보내드립니다',
    htmlBody: body,
    name: '명문각'
  });
}

/* ═══════════ 백그라운드 집필 (1분마다) ═══════════ */
function processQueue(){
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(1000)) return;
  try {
    const sh = getSheet();
    const rows = sh.getDataRange().getValues();
    const started = Date.now();
    for (let i = 1; i < rows.length; i++) {
      const status = String(rows[i][7]||'');
      if (status.indexOf('작성중') !== 0) continue;
      let data;
      try { data = JSON.parse(rows[i][8]); }
      catch(e){ sh.getRange(i+1,8).setValue('오류: 데이터 손상'); continue; }

      /* ── 해몽: 단발 ── */
      if (data.type === 'dream') {
        try {
          const user = '[해몽 신청]\n이름: ' + data.name +
            '\n꿈을 꾼 시기: ' + data.when + '\n깬 뒤의 기분: ' + data.mood +
            (data.birth ? '\n생년월일: ' + data.birth : '') +
            '\n\n[꿈 내용]\n' + data.dream + '\n\n해몽서 본문만 출력하세요.';
          const txt = callAnthropic(DREAM_SYS, user, MODELS.dream).trim();
          sh.getRange(i+1,10).setValue(JSON.stringify([txt]));
          const email = String(rows[i][6]||'');
          if (String(rows[i][10]||'') === 'Y' && email.indexOf('@') > 0) {
            sendDreamReport(data, txt, email);
            sh.getRange(i+1,8).setValue('발송완료');
          } else {
            sh.getRange(i+1,8).setValue('작성완료');
          }
        } catch(err){ sh.getRange(i+1,8).setValue('오류: ' + String(err).slice(0,110)); }
        continue;
      }

      /* ── 사주: 다장 집필 ── */
      let secs = [];
      try { secs = rows[i][9] ? JSON.parse(rows[i][9]) : []; } catch(e){ secs = []; }
      const dataBlock = buildDataBlock(data);
      const set = getSecSet(data);
      const model = tierModel(data);
      let failed = false;
      while (secs.length < set.length) {
        if (Date.now() - started > 4.2*60*1000) return;   // 다음 분에 이어서
        const idx = secs.length;
        const prev = secs.length
          ? '\n[앞 장 요약(중복 금지 참고용)]\n' + secs.map(function(x,j){
              return set[j].t + ': ' + String(x).slice(0,200); }).join('\n')
          : '';
        try {
          const txt = callAnthropic(PERSONA,
            dataBlock + prev + '\n\n[이번 장 지시]\n제' + (idx+1) + '장 「' + set[idx].t + '」\n' +
            set[idx].p + '\n앞 장과 내용이 겹치지 않게 하고, 본문만 출력하세요.', model);
          secs.push(txt.trim());
          sh.getRange(i+1,10).setValue(JSON.stringify(secs));
          sh.getRange(i+1,8).setValue(secs.length < set.length ? ('작성중 ' + secs.length + '/' + set.length) : '작성완료');
        } catch(err){
          sh.getRange(i+1,8).setValue('오류: ' + String(err).slice(0,110));
          failed = true; break;
        }
      }
      if (!failed && secs.length === set.length && String(rows[i][10]||'') === 'Y') {
        const email = String(rows[i][6]||'');
        if (email.indexOf('@') > 0) {
          try { sendSajuReport(data, secs, email); sh.getRange(i+1,8).setValue('발송완료'); }
          catch(err){ sh.getRange(i+1,8).setValue('작성완료(발송오류: ' + String(err).slice(0,80) + ')'); }
        } else {
          sh.getRange(i+1,8).setValue('작성완료(이메일없음)');
        }
      }
    }
  } finally { lock.releaseLock(); }
}

/* ═══════════ 요청 처리 ═══════════ */
function doPost(e){
  let req;
  try { req = JSON.parse(e.postData.contents); } catch(err){ return out({ok:false,msg:'요청 형식 오류'}); }

  /* 무료 티저 */
  if (req.action === 'teaser') {
    try { return out({ok:true, text: makeTeaser(req.data)}); }
    catch(err){ return out({ok:false, msg:String(err).slice(0,140)}); }
  }

  /* 신청 등록 (사주·해몽 공통) */
  if (req.action === 'apply') {
    try {
      const sh = getSheet();
      const id = Utilities.formatDate(new Date(),'Asia/Seoul','MMdd') + '-' +
                 String(Math.floor(1000 + Math.random()*9000));
      const d = req.data || {};
      sh.appendRow([id, Utilities.formatDate(new Date(),'Asia/Seoul','yyyy-MM-dd HH:mm'),
        req.service||'', d.product||'', d.price||'', d.name||'', d.email||'',
        '입금대기', JSON.stringify(d), '', '']);
      return out({ok:true, id:id});
    } catch(err){ return out({ok:false, msg:String(err).slice(0,140)}); }
  }

  /* 고객: 입금 완료 통지 */
  if (req.action === 'paid') {
    const sh = getSheet();
    const r = findRow(sh, req.id);
    if (r < 0) return out({ok:false, msg:'주문을 찾을 수 없습니다'});
    if (String(sh.getRange(r,8).getValue()) === '입금대기') sh.getRange(r,8).setValue('입금확인요청');
    return out({ok:true});
  }

  /* 관리자: 집필 시작 */
  if (req.action === 'queue') {
    if (req.key !== SECRET) return out({ok:false, msg:'열람 키가 다릅니다'});
    const sh = getSheet();
    const r = findRow(sh, req.id);
    if (r < 0) return out({ok:false, msg:'주문을 찾을 수 없습니다'});
    sh.getRange(r,8).setValue('작성중 0');
    sh.getRange(r,11).setValue(req.autoSend === 'Y' ? 'Y' : 'N');
    return out({ok:true});
  }

  /* 관리자: 상태 변경 */
  if (req.action === 'done') {
    if (req.key !== SECRET) return out({ok:false, msg:'열람 키가 다릅니다'});
    const sh = getSheet();
    const r = findRow(sh, req.id);
    if (r < 0) return out({ok:false, msg:'주문을 찾을 수 없습니다'});
    sh.getRange(r,8).setValue(req.status||'작성완료');
    return out({ok:true});
  }

  return out({ok:false, msg:'알 수 없는 요청'});
}

function doGet(e){
  const p = e.parameter || {};
  if (p.key !== SECRET) return out({ok:false, msg:'열람 키가 다릅니다', ver:VERSION});
  const sh = getSheet();
  const v = sh.getDataRange().getValues();

  if (p.action === 'report') {
    const r = findRow(sh, p.id);
    if (r < 0) return out({ok:false, msg:'주문을 찾을 수 없습니다'});
    let secs = [];
    try { secs = v[r-1][9] ? JSON.parse(v[r-1][9]) : []; } catch(err){}
    return out({ok:true, secs:secs, status:String(v[r-1][7]||'')});
  }

  const list = [];
  for (let i = v.length - 1; i >= 1; i--) {
    list.push({id:String(v[i][0]), time:String(v[i][1]), service:String(v[i][2]),
      product:String(v[i][3]), price:String(v[i][4]), name:String(v[i][5]),
      status:String(v[i][7])});
    if (list.length >= 60) break;
  }
  return out({ok:true, ver:VERSION, list:list});
}
