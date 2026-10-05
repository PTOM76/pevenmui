import { DialogContent, Table, TableBody, TableCell, TableRow } from '@mui/material'
import { WindowDialog } from '../window/WindowDialog'

/** キーボード・マウス操作の一覧。`rows` は [キー, 説明] */
export function ShortcutsDialog(p: { open: boolean; onClose: () => void; title: string; rows: [string, string][] }) {
  return (
    <WindowDialog open={p.open} onClose={p.onClose} title={p.title} name="shortcuts" width={600} height={560}>
      <DialogContent>
        <Table size="small">
          <TableBody>
            {p.rows.map(([key, desc]) => (
              <TableRow key={key}>
                <TableCell sx={{ whiteSpace: 'nowrap', fontFamily: 'monospace' }}>{key}</TableCell>
                <TableCell>{desc}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </DialogContent>
    </WindowDialog>
  )
}
