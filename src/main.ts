import "leaflet/dist/leaflet.css";
import "./style.css";
import leaflet, { LatLng } from "leaflet";
import luck from "./luck";
import "./leafletWorkaround";
import { Board } from "./board";

const MERRILL_CLASSROOM = leaflet.latLng({
  lat: 36.9995,
  lng: -122.0533,
});

const NULL_ISLAND = leaflet.latLng({
  lat: 0,
  lng: 0,
});

const GAMEPLAY_ZOOM_LEVEL = 19;
const TILE_DEGREES = 1e-4;
const NEIGHBORHOOD_SIZE = 8;
const PIT_SPAWN_PROBABILITY = 0.1;
const FIRST_ELEMENT = 0;

const mapContainer = document.querySelector<HTMLElement>("#map")!;

const map = leaflet.map(mapContainer, {
  center: MERRILL_CLASSROOM,
  zoom: GAMEPLAY_ZOOM_LEVEL,
  minZoom: GAMEPLAY_ZOOM_LEVEL,
  maxZoom: GAMEPLAY_ZOOM_LEVEL,
  zoomControl: false,
  scrollWheelZoom: false,
});

leaflet
  .tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19,
    attribution:
      '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>',
  })
  .addTo(map);

class Pit {
  posI: number;
  posJ: number;
  value: number;
  boundedArea: leaflet.Layer;
  coinStash: Coin[];

  constructor(
    i: number,
    j: number,
    startingVal: number,
    bounds: leaflet.LatLngBounds
  ) {
    this.posI = i;
    this.posJ = j;
    this.value = startingVal;
    this.coinStash = [];

    this.boundedArea = leaflet.rectangle(bounds) as leaflet.Layer;
    this.addPopUp();
    this.boundedArea.addTo(map);
  }

  private addPopUp() {
    this.boundedArea.bindPopup(() => {
      const container = document.createElement("div");
      container.innerHTML = `
                <div>There is a pit here at "${this.posI},${
        this.posJ
      }". It has value <span id="value">${this.value}</span>.</div>
                <div id="stash">${printCoinsFromList(this.coinStash)}</div>
                <button id="poke">poke</button>
                <button id="add">add</button>`;

      const poke = container.querySelector<HTMLButtonElement>("#poke")!;
      poke.addEventListener("click", () => {
        if (this.value > 0) {
          ownedCoins.push(new Coin(this.posI, this.posJ, this.value));
          this.value--;
          container.querySelector<HTMLSpanElement>("#value")!.innerHTML =
            this.value.toString();
          points++;
          statusPanel.innerHTML = printCoinsFromList(ownedCoins);
        }
      });

      const add = container.querySelector<HTMLButtonElement>("#add")!;
      add.addEventListener("click", () => {
        if (points > 0) {
          this.value++;
          container.querySelector<HTMLSpanElement>("#value")!.innerHTML =
            this.value.toString();

          this.stashNewCoin();
          container.querySelector<HTMLSpanElement>("#stash")!.innerHTML =
            printCoinsFromList(this.coinStash);
          points--;
          statusPanel.innerHTML = printCoinsFromList(ownedCoins);
        }
      });
      return container;
    });
  }

  private stashNewCoin() {
    const coin = ownedCoins[FIRST_ELEMENT];
    ownedCoins = ownedCoins.slice(FIRST_ELEMENT + 1);
    this.coinStash.push(coin);
  }
}

class Coin {
  id: string;

  constructor(i: number, j: number, serial: number) {
    this.id = `${i}:${j}#${serial}`;
  }
}

const allPits: Pit[] = [];
let ownedCoins: Coin[] = [];

const board = new Board(NULL_ISLAND, TILE_DEGREES, NEIGHBORHOOD_SIZE);

const playerLocation = { i: 0, j: 0 };

const playerMarker = leaflet.marker(MERRILL_CLASSROOM);
playerMarker.bindTooltip(
  `You are located at cell: ${playerLocation.i} , ${playerLocation.j}`
);
playerMarker.addTo(map);

const sensorButton = document.querySelector("#sensor")!;
sensorButton.addEventListener("click", () => {
  navigator.geolocation.watchPosition((position) => {
    playerMarker.setLatLng(
      leaflet.latLng(position.coords.latitude, position.coords.longitude)
    );
    map.setView(playerMarker.getLatLng());
    generatePits(playerMarker.getLatLng());
  });
});

let points = 0;
const statusPanel = document.querySelector<HTMLDivElement>("#statusPanel")!;
statusPanel.innerHTML = "No points yet...";

function makePit(i: number, j: number) {
  const bounds = board.getCellBounds({ i: i, j: j });

  const pit = new Pit(
    i,
    j,
    Math.floor(luck([i, j, "initialValue"].toString()) * 100),
    bounds
  );
  allPits.push(pit);
}

function generatePits(playerPos: LatLng) {
  const neighboringCells = board.getCellsNearPoint(playerPos);
  const currentCell = board.getCellForPoint(playerPos);

  playerLocation.i = currentCell.i;
  playerLocation.j = currentCell.j;
  playerMarker.setTooltipContent(
    `You are located at cell: ${playerLocation.i} , ${playerLocation.j}`
  );
  console.log(playerLocation);

  neighboringCells.forEach((cell) => {
    if (luck([cell.i, cell.j].toString()) < PIT_SPAWN_PROBABILITY) {
      makePit(cell.i, cell.j);
    }
  });
}

function printCoinsFromList(coinList: Coin[]): string {
  if (!coinList.length) {
    console.log("pass");
    return "There are currently 0 coins :(";
  }

  let result: string = "";
  for (const coin of coinList) {
    result += `[${coin.id}], `;
  }
  return result;
}

generatePits(playerMarker.getLatLng());
