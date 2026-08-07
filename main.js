async function getWeeklyCharts() {
  const apiKey = 'd84c9b2caa4ff06ef2c35d5ba07f7f02';
  const username = 'happle5222';

  const url = `https://ws.audioscrobbler.com/2.0/?method=user.getweeklychartlist&user=${username}&api_key=${apiKey}&format=json`;

  try {
    const response = await fetch(url);
    const data = await response.json();
    return data;
  } catch (err) {
    console.error(err);
  }
}

async function getWeeklyAlbumChart(from,to) {
  const apiKey = 'd84c9b2caa4ff06ef2c35d5ba07f7f02';
  const username = 'happle5222';

  const url = `https://ws.audioscrobbler.com/2.0/?method=user.getWeeklyAlbumChart&user=${username}&api_key=${apiKey}&from=${from}&to=${to}&format=json`;

  try {
    const response = await fetch(url);
    const data = await response.json();
    return data;
  } catch (err) {
    console.error(err);
  }
}

async function getWikipediaCover(artist, album) {
  const search = await fetch(
    `https://en.wikipedia.org/w/api.php?origin=*&action=query&list=search&srsearch=${encodeURIComponent(
      `${artist} ${album} album`
    )}&format=json`
  ).then(r => r.json());

  const page = search.query.search[0];
  if (!page) return null;

  const wiki = await fetch(
    `https://en.wikipedia.org/w/api.php?origin=*&action=parse&page=${encodeURIComponent(
      page.title
    )}&prop=wikitext&format=json`
  ).then(r => r.json());

  const text = wiki.parse?.wikitext?.["*"];
  if (!text) return null;

  const match = text.match(/^\|\s*cover\s*=\s*(.+)$/im);
  if (!match) return null;

  const filename = match[1]
    .split("|")[0]       // remove any formatting/template args
    .replace(/\[\[|\]\]/g, "")
    .trim();

  const image = await fetch(
    `https://en.wikipedia.org/w/api.php?origin=*&action=query&titles=${encodeURIComponent(
      `File:${filename.replace(/^File:/i, "")}`
    )}&prop=imageinfo&iiprop=url&format=json`
  ).then(r => r.json());

  const file = Object.values(image.query.pages)[0];
  return file.imageinfo?.[0]?.url ?? null;
}

async function main() {
  let weeklyCharts = await getWeeklyCharts();
  let mostRecentPeriod = weeklyCharts.weeklychartlist.chart[weeklyCharts.weeklychartlist.chart.length-1];
  let from = mostRecentPeriod.from;
  let to = mostRecentPeriod.to;
  let topAlbums = await getWeeklyAlbumChart(from,to);
  let priorWeek = weeklyCharts.weeklychartlist.chart[weeklyCharts.weeklychartlist.chart.length - 2];
  let priorFrom = priorWeek.from;
  let priorTo = priorWeek.to;
  let priorTopAlbums = await getWeeklyAlbumChart(priorFrom,priorTo);

  const template = document.getElementById("chart-entry-template");
  document.getElementById("top-text").textContent = "Week of " + new Date(parseInt(to,10)*1000).toLocaleDateString('en-US');
  
  for (let i=1; i<21; i++) {

    const entry = template.content.cloneNode(true);
    const img = entry.querySelector(".albumImage");
    entry.querySelector(".rankText").textContent = i;

    // console.log(new Date(parseInt(from,10)*1000).toLocaleDateString('en-US'));
    // console.log(new Date(parseInt(to,10)*1000).toLocaleDateString('en-US'));

    let selectedAlbum = topAlbums.weeklyalbumchart.album[i-1].name;
    let selectedArtist = topAlbums.weeklyalbumchart.album[i-1].artist["#text"];
    let selectedPlays = topAlbums.weeklyalbumchart.album[i-1].playcount;
    entry.querySelector(".songInfoText").innerHTML = "<b>" + selectedAlbum + "</b>" + "<br>" + selectedArtist;
    getWikipediaCover(selectedArtist, selectedAlbum).then(cover => { img.src = cover; });

    let foundAlbum = priorTopAlbums.weeklyalbumchart.album.find(album =>
      album.name === selectedAlbum &&
      album.artist["#text"] === selectedArtist
    );
    if (foundAlbum) {
      let previousWeekRank = parseInt(foundAlbum["@attr"].rank,10);
      let upOrDown = i < previousWeekRank ? "▲ " : "▼ ";
      if (i-previousWeekRank == 0) {
        entry.querySelector(".containerDiv").innerHTML = '<div class="movementArrow">▶</div>';
      } else {
        entry.querySelector(".containerDiv").innerHTML = '<div class="movementArrow">' + upOrDown + '</div><br><div class="numberChange"><b>' +String(Math.abs(i-previousWeekRank)) + '</b></div>';
      }
    } else {
      entry.querySelector(".containerDiv").innerHTML = '<div class="newBox">NEW</div>';
    }

    entry.querySelector(".playCount").innerHTML = "<b>" + selectedPlays + " plays</b>"
    
    document.body.appendChild(entry);
  }
}

main()
