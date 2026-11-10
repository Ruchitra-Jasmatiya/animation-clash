import { useState } from 'react'
import { motion } from 'framer-motion'
import { adm } from '../../lib/api'
import { Empty, ErrorBox, Icon, PageHead, Spinner, deviceOf, fmtDate, useAsync } from './ui'

const SOURCE = { manager: 'Store manager', 'django-admin': 'Django /admin' }
const ACTION = { create: 'Added', update: 'Changed', delete: 'Deleted', password: 'Password', logout: 'Signed out' }

export default function Security() {
  const [tab, setTab] = useState('logins')
  const { data, loading, error, reload } = useAsync(() => adm.get(`/logs/?type=${tab}&limit=300`), [tab])

  return (
    <>
      <PageHead title="Security log" sub="Every sign-in attempt and every change made in the manager.">
        <button className="ad-btn ghost" onClick={reload}><Icon name="refresh" size={18} /> Refresh</button>
      </PageHead>

      <div className="ad-chips" role="tablist">
        <button role="tab" aria-selected={tab === 'logins'} className={tab === 'logins' ? 'on' : ''} onClick={() => setTab('logins')}>Sign-ins</button>
        <button role="tab" aria-selected={tab === 'activity'} className={tab === 'activity' ? 'on' : ''} onClick={() => setTab('activity')}>Activity</button>
      </div>

      {loading && !data ? <Spinner /> : error && !data ? <ErrorBox message={error} onRetry={reload} /> : tab === 'logins' ? (
        <>
          <motion.div className={`ad-alert ${data.failed_24h ? 'warn' : 'good'}`} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
            <Icon name="shield" /> {data.failed_24h ? `${data.failed_24h} failed sign-in attempt${data.failed_24h === 1 ? '' : 's'} in the last 24 hours. If that wasn't you, change your password in Settings.` : 'No failed sign-in attempts in the last 24 hours.'}
          </motion.div>
          {!data.rows.length ? <Empty icon="shield" title="No sign-ins recorded yet" /> : (
            <div className="ad-card table-card">
              <table className="ad-table">
                <thead><tr><th>When</th><th>Username</th><th>Result</th><th>Where</th><th>IP address</th><th>Device</th></tr></thead>
                <tbody>
                  {data.rows.map((r) => (
                    <tr key={r.id}>
                      <td data-l="When">{fmtDate(r.at)}</td>
                      <td data-l="Username"><b>{r.username || '—'}</b></td>
                      <td data-l="Result"><span className={`ad-badge ${r.success ? 's-paid' : r.blocked ? 's-shipped' : 's-cancelled'}`}>{r.success ? 'Signed in' : r.blocked ? 'Blocked' : 'Failed'}</span></td>
                      <td data-l="Where">{SOURCE[r.source] || r.source}</td>
                      <td data-l="IP address"><code>{r.ip || '—'}</code></td>
                      <td data-l="Device">{deviceOf(r.user_agent)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      ) : !data.length ? <Empty icon="shield" title="No activity yet" text="Changes you make will be listed here." /> : (
        <div className="ad-card table-card">
          <table className="ad-table">
            <thead><tr><th>When</th><th>Who</th><th>What</th><th>Details</th><th>IP address</th></tr></thead>
            <tbody>
              {data.map((r) => (
                <tr key={r.id}>
                  <td data-l="When">{fmtDate(r.at)}</td>
                  <td data-l="Who"><b>{r.user || '—'}</b></td>
                  <td data-l="What"><span className={`ad-badge ${r.action === 'delete' ? 's-cancelled' : r.action === 'create' ? 's-paid' : 's-pending'}`}>{ACTION[r.action] || r.action}</span></td>
                  <td data-l="Details">{r.summary}</td>
                  <td data-l="IP address"><code>{r.ip || '—'}</code></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <p className="ad-fine pad-t">Logs are read-only here and can't be edited or deleted from the manager. Visitors browsing the website are not signed in, so only staff sign-ins appear.</p>
    </>
  )
}
