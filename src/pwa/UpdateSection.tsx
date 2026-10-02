import { useState } from 'react'
import { Box, Button, CircularProgress, Typography } from '@mui/material'
import { fill, useLabels, type Labels } from '../labels'
import { checkForUpdate, getAppBuild, updateNow, type UpdateCheckResult } from './updateCheck'

const RESULT_TEXT: Record<UpdateCheckResult['kind'], keyof Labels> = {
  found: 'updateAvailable',
  latest: 'updateLatest',
  unsupported: 'updateUnsupported',
  failed: 'updateFailed',
}

/** 設定画面の「アップデート」: 今のバージョンと、新しい版の確認ボタン（Group の中に置く） */
export function UpdateSection() {
  const l = useLabels()
  const build = getAppBuild()
  const [checking, setChecking] = useState(false)
  const [result, setResult] = useState<UpdateCheckResult | null>(null)

  const check = async () => {
    setChecking(true)
    setResult(null)
    setResult(await checkForUpdate())
    setChecking(false)
  }

  return (
    <Box sx={{ gridColumn: '1 / -1', display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 1.5 }}>
      <Typography sx={{ fontSize: 13 }}>
        {l.version} <span className="selectable">{build}</span>
      </Typography>
      <Button size="small" variant="outlined" disabled={checking} onClick={() => void check()}>
        {l.updateCheck}
      </Button>
      {checking && <CircularProgress size={14} />}
      {/* 結果は次の行に出し、長くても設定の幅の中で折り返す */}
      {result && (
        <Box sx={{ flexBasis: '100%', minWidth: 0, display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 1 }}>
          <Typography sx={{ fontSize: 12, minWidth: 0, overflowWrap: 'anywhere', color: result.kind === 'failed' ? 'error.main' : 'text.secondary' }}>
            {l[RESULT_TEXT[result.kind]]}
            {result.kind === 'found' && result.build && <span className="selectable">{fill(l.updateAvailableBuild, { from: build, to: result.build })}</span>}
          </Typography>
          {/* 新しい版があれば、ここからそのまま更新できる */}
          {result.kind === 'found' && (
            <Button size="small" variant="contained" onClick={() => void updateNow()}>
              {l.updateReload}
            </Button>
          )}
        </Box>
      )}
    </Box>
  )
}
