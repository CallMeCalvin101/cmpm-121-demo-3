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
const DIVIDER_CHAR = "+";
const VERTICLE = "verticle";
const HORIZONTAL = "horizontal";

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

interface Momento<T> {
  toMomento(): T;
  fromMomento(momento: T): void;
}

class Pit implements Momento<string> {
  posI: number;
  posJ: number;
  value: number;
  boundedArea: leaflet.Layer;
  coinStash: string[];

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

  toMomento() {
    const momento = `${this.value}${DIVIDER_CHAR}${this.coinStash.toString()}`;
    this.value = 0;
    this.coinStash = [];
    this.boundedArea.removeFrom(map);
    return momento;
  }

  fromMomento(momento: string) {
    const result = momento.split(DIVIDER_CHAR);
    this.value = parseInt(result[0]);
    this.coinStash = result[1].split(",");
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
          ownedCoins.push(createCoin(this.posI, this.posJ, this.value));
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

function createCoin(i: number, j: number, serial: number) {
  return `${i}:${j}#${serial}`;
}

const knownMomentos: Map<string, string> = new Map();
let currentPits: Pit[] = [];
let ownedCoins: string[] = [];
const board = new Board(NULL_ISLAND, TILE_DEGREES, NEIGHBORHOOD_SIZE);
const playerLocation = { i: 0, j: 0 };
const playerMarker = leaflet.marker(MERRILL_CLASSROOM);
const playerPolyline = leaflet.polyline([], { color: "red" }).addTo(map);

playerMarker.bindTooltip(
  `You are located at cell: ${playerLocation.i} , ${playerLocation.j}`
);
playerMarker.addTo(map);

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

  const key = [i, j].toString();
  if (knownMomentos.has(key)) {
    pit.fromMomento(knownMomentos.get(key)!);
  }

  currentPits.push(pit);
}

function generatePits(playerPos: LatLng) {
  const neighboringCells = board.getCellsNearPoint(playerPos);
  setPlayerPosition(playerPos);

  neighboringCells.forEach((cell) => {
    const key = [cell.i, cell.j].toString();
    if (luck(key) < PIT_SPAWN_PROBABILITY) {
      makePit(cell.i, cell.j);
      makePit(cell.i, cell.j);
    }
  });
}

function clearCurrentPits() {
  for (let pits of currentPits) {
    const key = [pits.posI, pits.posJ].toString();
    const momento = pits.toMomento();
    knownMomentos.set(key, momento);
  }
  currentPits = [];
}

function printCoinsFromList(coinList: string[]): string {
  if (!coinList.length) {
    return "There are currently 0 coins :(";
  }

  let result: string = "";
  for (const coin of coinList) {
    result += `[${coin}], `;
  }
  return result;
}

function setPlayerPosition(playerPos: LatLng) {
  const currentCell = board.getCellForPoint(playerPos);

  playerLocation.i = currentCell.i;
  playerLocation.j = currentCell.j;
  playerMarker.setTooltipContent(
    `You are located at cell: ${playerLocation.i} , ${playerLocation.j}`
  );
}

function updateMap(newPos: LatLng) {
  clearCurrentPits();
  playerMarker.setLatLng(newPos);
  playerPolyline.addLatLng(newPos).redraw();
  map.setView(playerMarker.getLatLng());
  generatePits(playerMarker.getLatLng());
  setStorage();
}

function movePlayer(direction: string, value: number) {
  const newLatLng = playerMarker.getLatLng();
  if (direction == VERTICLE) {
    newLatLng.lat += value;
  } else {
    newLatLng.lng += value;
  }

  updateMap(newLatLng);
}

function createUIButtons() {
  const sensorButton = document.querySelector("#sensor")!;
  sensorButton.addEventListener("click", () => {
    navigator.geolocation.watchPosition((position) => {
      updateMap(
        leaflet.latLng(position.coords.latitude, position.coords.longitude)
      );
    });
  });

  const northButton = document.querySelector("#north")!;
  northButton.addEventListener("click", () => {
    movePlayer(VERTICLE, TILE_DEGREES);
  });

  const southButton = document.querySelector("#south")!;
  southButton.addEventListener("click", () => {
    movePlayer(VERTICLE, -TILE_DEGREES);
  });

  const westButton = document.querySelector("#west")!;
  westButton.addEventListener("click", () => {
    movePlayer(HORIZONTAL, -TILE_DEGREES);
  });

  const eastButton = document.querySelector("#east")!;
  eastButton.addEventListener("click", () => {
    movePlayer(HORIZONTAL, TILE_DEGREES);
  });

  const resetButton = document.querySelector("#reset")!;
  resetButton.addEventListener("click", () => {
    clearCurrentPits();
    knownMomentos.clear();
    updateMap(playerMarker.getLatLng());
  });
}

function setStorage() {
  const playerLatLng = playerMarker.getLatLng();
  localStorage.setItem("playerLat", playerLatLng.lat.toString());
  localStorage.setItem("playerLng", playerLatLng.lng.toString());

  const keys: string[] = [];
  const values: string[] = [];
  knownMomentos.forEach((value, key) => {
    keys.push(key);
    values.push(value);
  });

  localStorage.setItem("momentoKeys", keys.toString());
  localStorage.setItem("momentoValues", values.toString());
  localStorage.setItem("playerCoins", ownedCoins.toString());
  console.log(ownedCoins.toString());
  console.log(localStorage.getItem("playerCoins")!.split(","));
}

function fromStorage() {
  const storedLat = parseFloat(localStorage.getItem("playerLat")!);
  const storedLng = parseFloat(localStorage.getItem("playerLng")!);
  playerMarker.setLatLng(leaflet.latLng(storedLat, storedLng));

  const unpairedKeys = localStorage.getItem("momentoKeys")!.split(",");
  const orderedKeys: string[] = [];
  for (let i = 0; i < unpairedKeys.length; i += 2) {
    const pairedKey = `${unpairedKeys[i]},${unpairedKeys[i + 1]}`;
    orderedKeys.push(pairedKey);
  }

  const values = localStorage.getItem("momentoValues")!.split(",");

  for (let i = 0; i < values.length; i++) {
    knownMomentos.set(orderedKeys[i], values[i]);
  }

  ownedCoins = localStorage.getItem("playerCoins")!.split(",");
  updateMap(playerMarker.getLatLng());
  points = ownedCoins.length;
}

if (!(localStorage.getItem("playerLat") == null)) {
  console.log(localStorage.getItem("playerLat"));
  console.log("test");
  fromStorage();
}

updateMap(playerMarker.getLatLng());
createUIButtons();
