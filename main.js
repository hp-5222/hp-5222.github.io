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

  const template = document.querySelector("#chart-entry-template");
  
  for (let i=1; i<21; i++) {

    const entry = template.content.cloneNode(true);
    entry.querySelector(".rankText").textContent = i;

    // console.log(new Date(parseInt(from,10)*1000).toLocaleDateString('en-US'));
    // console.log(new Date(parseInt(to,10)*1000).toLocaleDateString('en-US'));

    let selectedAlbum = topAlbums.weeklyalbumchart.album[i-1].name;
    let selectedArtist = topAlbums.weeklyalbumchart.album[i-1].artist["#text"];
    let selectedPlays = topAlbums.weeklyalbumchart.album[i-1].playcount;
    entry.querySelector(".songInfoText").innerHTML = "<b>" + selectedAlbum + "</b>" + "<br>" + selectedArtist;

    let foundAlbum = priorTopAlbums.weeklyalbumchart.album.find(album =>
      album.name === selectedAlbum &&
      album.artist["#text"] === selectedArtist
    );
    if (foundAlbum) {
      let previousWeekRank = parseInt(foundAlbum["@attr"].rank,10);
      let upOrDown = i < previousWeekRank ? "▲ " : "▼ ";
      let finalStr = upOrDown + String(Math.abs(i-previousWeekRank));
      if (i-previousWeekRank == 0) {
        console.log("▶")
      } else {
        console.log(finalStr);
      }
    } else {
      console.log("NEW")
    }
    console.log("-------------------")
  }

  document.body.appendChild(entry);
}

main()
