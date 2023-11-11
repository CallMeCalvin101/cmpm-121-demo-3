import leaflet from "leaflet";
const ORIGIN = { i: 0, j: 0 };

interface Cell {
  readonly i: number;
  readonly j: number;
}

export class Board {
  readonly mapOrigin: leaflet.LatLng;
  readonly tileWidth: number;
  readonly tileVisibilityRadius: number;

  private readonly knownCells: Map<string, Cell>;

  constructor(
    mapOrigin: leaflet.LatLng,
    tileWidth: number,
    tileVisibilityRadius: number
  ) {
    this.mapOrigin = mapOrigin;
    this.tileWidth = tileWidth;
    this.tileVisibilityRadius = tileVisibilityRadius;
    this.knownCells = new Map();
    this.knownCells.set([ORIGIN.i, ORIGIN.j].toString(), ORIGIN);
  }

  private getCanonicalCell(cell: Cell): Cell {
    const { i, j } = cell;
    const key = [i, j].toString();

    if (!this.knownCells.has(key)) {
      this.addKnownCell(cell);
    }
    return this.knownCells.get(key)!;
  }

  addKnownCell(cell: Cell) {
    const key = [cell.i, cell.j].toString();
    this.knownCells.set(key, cell);
  }

  getCellForPoint(point: leaflet.LatLng): Cell {
    const getCell = {
      i: Math.floor((point.lat - this.mapOrigin.lat) / this.tileWidth),
      j: Math.floor((point.lng - this.mapOrigin.lng) / this.tileWidth),
    };
    return this.getCanonicalCell(getCell);
  }

  getCellBounds(cell: Cell): leaflet.LatLngBounds {
    return leaflet.latLngBounds([
      [
        this.mapOrigin.lat + cell.i * this.tileWidth,
        this.mapOrigin.lng + cell.j * this.tileWidth,
      ],
      [
        this.mapOrigin.lat + (cell.i + 1) * this.tileWidth,
        this.mapOrigin.lng + (cell.j + 1) * this.tileWidth,
      ],
    ]);
  }

  getCellsNearPoint(point: leaflet.LatLng): Cell[] {
    const resultCells: Cell[] = [];
    const originCell = this.getCellForPoint(point);

    for (
      let i = originCell.i - this.tileVisibilityRadius;
      i < originCell.i + this.tileVisibilityRadius;
      i++
    ) {
      for (
        let j = originCell.j - this.tileVisibilityRadius;
        j < originCell.j + this.tileVisibilityRadius;
        j++
      ) {
        resultCells.push(this.getCanonicalCell({ i: i, j: j }));
      }
    }

    return resultCells;
  }
}
