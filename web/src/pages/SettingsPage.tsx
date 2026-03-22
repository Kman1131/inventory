import { useState } from 'react'
import { useForm } from 'react-hook-form'
import toast from 'react-hot-toast'
import { STORAGE_KEYS, getSettings, api } from '../api/client'

interface SettingsForm {
  apiUrl: string
  apiKey: string
}

export default function SettingsPage() {
  const [testing, setTesting]   = useState(false)
  const [connStatus, setConnStatus] = useState<'idle' | 'ok' | 'error'>('idle')
  const [connMsg, setConnMsg]   = useState('')

  const { register, handleSubmit, getValues, formState: { isDirty } } = useForm<SettingsForm>({
    defaultValues: getSettings(),
  })

  const onSave = (data: SettingsForm) => {
    localStorage.setItem(STORAGE_KEYS.API_URL, data.apiUrl.replace(/\/$/, ''))
    localStorage.setItem(STORAGE_KEYS.API_KEY, data.apiKey)
    toast.success('Settings saved')
    setConnStatus('idle')
  }

  const testConnection = async () => {
    const { apiUrl, apiKey } = getValues()
    localStorage.setItem(STORAGE_KEYS.API_URL, apiUrl.replace(/\/$/, ''))
    localStorage.setItem(STORAGE_KEYS.API_KEY, apiKey)
    setTesting(true)
    setConnStatus('idle')
    try {
      const res = await api.health()
      setConnStatus('ok')
      setConnMsg(res.data.message ?? 'Connected')
      toast.success('Connected to server')
    } catch (e) {
      setConnStatus('error')
      setConnMsg((e as Error).message)
      toast.error('Connection failed')
    } finally {
      setTesting(false)
    }
  }

  return (
    <div className="space-y-6 max-w-lg">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="mt-1 text-sm text-gray-500">Configure the backend server connection</p>
      </div>

      <form onSubmit={handleSubmit(onSave)} className="card p-6 space-y-5">
        <div>
          <label className="label">Server URL</label>
          <input
            className="input"
            placeholder="http://192.168.1.x:3000"
            {...register('apiUrl', { required: true })}
          />
          <p className="mt-1 text-xs text-gray-400">
            The local IP address of your PC running the backend. E.g. <code className="bg-gray-100 px-1 rounded">http://192.168.1.50:3000</code>
          </p>
        </div>

        <div>
          <label className="label">API Key</label>
          <input
            type="password"
            className="input"
            placeholder="inventory-secret-key"
            {...register('apiKey', { required: true })}
          />
          <p className="mt-1 text-xs text-gray-400">
            Matches the <code className="bg-gray-100 px-1 rounded">API_KEY</code> environment variable on the backend.
          </p>
        </div>

        {connStatus !== 'idle' && (
          <div className={`rounded-lg px-4 py-3 text-sm flex items-start gap-2 ${
            connStatus === 'ok' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
          }`}>
            <span>{connStatus === 'ok' ? '✓' : '✕'}</span>
            <span>{connMsg}</span>
          </div>
        )}

        <div className="flex gap-3 pt-1">
          <button
            type="button"
            className="btn-secondary flex-1"
            onClick={testConnection}
            disabled={testing}
          >
            {testing ? <><span className="animate-spin inline-block mr-2">⟳</span>Testing…</> : '⟳ Test Connection'}
          </button>
          <button
            type="submit"
            className="btn-primary flex-1"
            disabled={!isDirty && connStatus === 'idle'}
          >
            Save Settings
          </button>
        </div>
      </form>

      {/* Info */}
      <div className="card p-5 space-y-3">
        <h2 className="text-sm font-semibold text-gray-700">How to find your server IP</h2>
        <div className="space-y-2 text-xs text-gray-600">
          <div className="flex items-start gap-2">
            <span className="font-bold text-primary-700 w-20 flex-shrink-0">Windows:</span>
            <code className="bg-gray-100 rounded px-2 py-1 block flex-1">ipconfig | findstr IPv4</code>
          </div>
          <div className="flex items-start gap-2">
            <span className="font-bold text-primary-700 w-20 flex-shrink-0">macOS:</span>
            <code className="bg-gray-100 rounded px-2 py-1 block flex-1">ipconfig getifaddr en0</code>
          </div>
          <div className="flex items-start gap-2">
            <span className="font-bold text-primary-700 w-20 flex-shrink-0">Linux:</span>
            <code className="bg-gray-100 rounded px-2 py-1 block flex-1">hostname -I | awk {'"{print $1}"'}</code>
          </div>
        </div>
        <p className="text-xs text-gray-400 pt-1">
          Both your PC and this browser must be on the same local Wi-Fi network.
        </p>
      </div>
    </div>
  )
}
