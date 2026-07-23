import { Link } from 'react-router-dom'
import { StatusPanel } from './StatusPanel'

export function RecordNotFound({ kind, backTo }: { kind: string; backTo: string }) {
  return (
    <StatusPanel title="记录不存在" tone="warning">
      <p>没有找到对应的{kind}，它可能已被清除或地址无效。</p>
      <Link className="text-link" to={backTo}>返回列表</Link>
    </StatusPanel>
  )
}
