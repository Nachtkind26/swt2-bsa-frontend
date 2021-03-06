import {VersionedDataObject} from '../../../data-provider/models/versioned-data-object.interface';
import {TableRow} from '../types/table-row.class';

export function toTableRows(payload: VersionedDataObject[]): TableRow[] {
  const rows: TableRow[] = [];

  payload.forEach((mitglied) => rows.push(new TableRow({payload: mitglied})));

  return rows;
}
