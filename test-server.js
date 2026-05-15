const app = require("./server");
const http = require("http");

const cases = [
  [["robart","william"],       ["Robert","Williams"]],
  [["mariah","garsia"],        ["Maria","Garcia"]],
  [["lynda","chan"],            ["Linda","Chen"]],
  [["davit","patell"],         ["David","Patel"]],
  [["suzan","obrien"],         ["Susan","O'Brien"]],
  [["vijay","naga rajan"],     ["Vijai","Nagarajan"]],
  [["esperansa","hernandes"],  ["Esperanza","Hernandez"]],
  [["bavesh","sha"],           ["Bhavesh","Shah"]],
  [["ahn","nooyen"],           ["Anh","Nguyen"]],
  [["arvind","krishna murthy"],["Aravind","Krishnamurthy"]],
  [["hyun jin","pakk"],        ["Hyun-jin","Park"]],
  [["thandi way","mokwena"],   ["Thandiwe","Mokoena"]],
  [["matteo","garcia ramirez"],["Mateo","Garcia-Ramirez"]],
  [["olafunmi","addebayo"],    ["Olufunmi","Adebayo"]],
  [["yusef","monsouri"],       ["Yusuf","Mansouri"]],
  [["seersha","murfy"],        ["Saoirse","Murphy"]],
  [["kaitlyn","catelin"],      ["Caitlyn","Caitlin"]],
  [["leeam","leem"],           ["Liam","Lim"]],
  [["eefa","mc carthy"],       ["Aoife","McCarthy"]],
  [["shoo ying","jang"],       ["Xiuying","Zhang"]],
  // Clean pass-through
  [["Robert","Williams"],      ["Robert","Williams"]],
  [["Saoirse","Murphy"],       ["Saoirse","Murphy"]],
  [["Aoife","McCarthy"],       ["Aoife","McCarthy"]],
];

async function timedCall(f, l) {
  const t0 = process.hrtime.bigint();
  const r = await fetch("http://localhost:3101/correct-name", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ first_name: f, last_name: l }),
  }).then(x => x.json());
  const ms = Number(process.hrtime.bigint() - t0) / 1e6;
  return { r, ms };
}

const server = http.createServer(app);
server.listen(3101, async () => {
  let pass = 0, fail = 0;
  const coldMs = [];
  const warmMs = [];
  for (const [[f, l], [ef, el]] of cases) {
    const cold = await timedCall(f, l);
    coldMs.push(cold.ms);
    const warm = await timedCall(f, l);
    warmMs.push(warm.ms);
    const ok = cold.r.first_name === ef && cold.r.last_name === el;
    ok ? pass++ : fail++;
    console.log(
      `${ok ? "PASS" : "FAIL"} (${f}, ${l}) -> (${cold.r.first_name}, ${cold.r.last_name}) ` +
      `cold=${cold.ms.toFixed(1)}ms warm=${warm.ms.toFixed(1)}ms low=${cold.r.low_confidence_flag}`
    );
  }
  const avg = a => (a.reduce((s, x) => s + x, 0) / a.length).toFixed(2);
  const max = a => Math.max(...a).toFixed(2);
  console.log(`\n${pass} passed, ${fail} failed`);
  console.log(`cold p_avg=${avg(coldMs)}ms p_max=${max(coldMs)}ms`);
  console.log(`warm p_avg=${avg(warmMs)}ms p_max=${max(warmMs)}ms`);
  server.close();
});
