import leaflet from "leaflet";

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
  }

  private getCanonicalCell(cell: Cell): Cell {
    const { i, j } = cell;
    const key = [i, j].toString();
    // ...
    return this.knownCells.get(key)!;
  }

  addKnownCell(cell: Cell) {
    const key = [cell.i, cell.j].toString();
    this.knownCells.set(key, cell);
  }

  getCellForPoint(point: leaflet.LatLng): Cell {
    const cellI = (point.lat - this.mapOrigin.lat) / this.tileWidth;
    const cellJ = (point.lng - this.mapOrigin.lng) / this.tileWidth;
    return this.getCanonicalCell({
      i: cellI,
      j: cellJ,
    });
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
        resultCells.push({ i: i, j: j });
      }
    }
    return resultCells;
  }
}
