'use client'

import { useState, useEffect } from 'react'
import { getSystemLogs, getSystemLogsStats, SystemLogEntry, SystemLogFilter } from '@/lib/admin/admin-client'
import {
  AlertCircle,
  Bug,
  Database,
  Shield,
  Filter,
  Search,
  ChevronDown,
  ChevronUp,
  Calendar,
  User,
  FileText,
  XCircle,
  RefreshCw,
  Download,
  Info,
  AlertTriangle,
} from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'

interface SystemLogsTabProps {
  isActive?: boolean
}

// Severity color mapping
const severityColors = {
  DEBUG: 'bg-gray-100 text-gray-800 border-gray-300',
  INFO: 'bg-blue-100 text-blue-800 border-blue-300',
  WARN: 'bg-yellow-100 text-yellow-800 border-yellow-300',
  ERROR: 'bg-red-100 text-red-800 border-red-300',
  FATAL: 'bg-purple-100 text-purple-800 border-purple-300',
}

// Error type icons
const errorTypeIcons = {
  runtime: Bug,
  auth: Shield,
  database: Database,
  validation: FileText,
  network: AlertCircle,
  unknown: XCircle,
}

export function SystemLogsTab({ isActive = false }: SystemLogsTabProps) {
  const [logs, setLogs] = useState<SystemLogEntry[]>([])
  const [stats, setStats] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null)
  const [page, setPage] = useState(0)
  const pageSize = 20

  // Filter states
  const [filters, setFilters] = useState<SystemLogFilter>({
    limit: pageSize,
    offset: 0,
  })

  const [showFilters, setShowFilters] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')

  // Load logs when tab is active
  useEffect(() => {
    if (isActive) {
      loadLogs()
      loadStats()
    }
  }, [isActive, filters, page])

  const loadLogs = async () => {
    setLoading(true)
    setError(null)

    try {
      const result = await getSystemLogs({
        ...filters,
        search: searchQuery || undefined,
        offset: page * pageSize,
        limit: pageSize,
      })

      if (result.success && result.data) {
        setLogs(result.data)
      } else {
        setError(result.error || 'Failed to load logs')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }

  const loadStats = async () => {
    try {
      const result = await getSystemLogsStats({
        severity: filters.severity,
        errorType: filters.errorType,
        isAuthError: filters.isAuthError,
        isSupabaseGetUserError: filters.isSupabaseGetUserError,
        startDate: filters.startDate,
        endDate: filters.endDate,
      })

      if (result.success && result.data) {
        setStats(result.data)
      }
    } catch (err) {
      console.error('Failed to load stats:', err)
    }
  }

  const handleFilterChange = (key: keyof SystemLogFilter, value: any) => {
    setFilters(prev => ({ ...prev, [key]: value }))
    setPage(0) // Reset to first page
  }

  const toggleFilter = (filterType: 'severity' | 'errorType', value: string) => {
    if (filterType === 'severity') {
      const currentValues = filters.severity || []
      const newValues = currentValues.includes(value as any)
        ? currentValues.filter(v => v !== value)
        : [...currentValues, value]

      handleFilterChange('severity', newValues.length > 0 ? newValues as any : undefined)
    } else {
      const currentValues = filters.errorType || []
      const newValues = currentValues.includes(value as any)
        ? currentValues.filter(v => v !== value)
        : [...currentValues, value]

      handleFilterChange('errorType', newValues.length > 0 ? newValues as any : undefined)
    }
  }

  const toggleExpand = (logId: string) => {
    setExpandedLogId(expandedLogId === logId ? null : logId)
  }

  const handleRefresh = () => {
    loadLogs()
    loadStats()
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">System Logs</h2>
          <p className="text-gray-600 mt-1">
            Monitor system errors and authentication issues
          </p>
        </div>
        <button
          onClick={handleRefresh}
          className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition"
          disabled={loading}
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Logs</p>
                <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
              </div>
              <FileText className="w-8 h-8 text-blue-500" />
            </div>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Auth Errors</p>
                <p className="text-2xl font-bold text-red-600">{stats.authErrors}</p>
              </div>
              <Shield className="w-8 h-8 text-red-500" />
            </div>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">getUser() Errors</p>
                <p className="text-2xl font-bold text-orange-600">{stats.supabaseGetUserErrors}</p>
              </div>
              <AlertTriangle className="w-8 h-8 text-orange-500" />
            </div>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Error Types</p>
                <p className="text-2xl font-bold text-gray-900">
                  {Object.keys(stats.byErrorType || {}).length}
                </p>
              </div>
              <Bug className="w-8 h-8 text-purple-500" />
            </div>
          </div>
        </div>
      )}

      {/* Search and Filter Bar */}
      <div className="bg-white rounded-lg border border-gray-200 p-4 space-y-4">
        <div className="flex flex-col md:flex-row gap-4">
          {/* Search */}
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search by error message, function, or path..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && loadLogs()}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Quick Filters */}
          <div className="flex gap-2">
            <button
              onClick={() => handleFilterChange('isAuthError', !filters.isAuthError)}
              className={`px-3 py-2 rounded-lg border transition ${
                filters.isAuthError
                  ? 'bg-red-50 border-red-300 text-red-700'
                  : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
              }`}
            >
              <Shield className="w-4 h-4 inline mr-1" />
              Auth Errors
            </button>

            <button
              onClick={() => handleFilterChange('isSupabaseGetUserError', !filters.isSupabaseGetUserError)}
              className={`px-3 py-2 rounded-lg border transition ${
                filters.isSupabaseGetUserError
                  ? 'bg-orange-50 border-orange-300 text-orange-700'
                  : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
              }`}
            >
              <AlertTriangle className="w-4 h-4 inline mr-1" />
              getUser() Errors
            </button>

            <button
              onClick={() => setShowFilters(!showFilters)}
              className="px-3 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 transition flex items-center gap-2"
            >
              <Filter className="w-4 h-4" />
              Filters
              {showFilters ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Expanded Filters */}
        {showFilters && (
          <div className="border-t border-gray-200 pt-4 space-y-4">
            {/* Severity Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Severity</label>
              <div className="flex flex-wrap gap-2">
                {(['DEBUG', 'INFO', 'WARN', 'ERROR', 'FATAL'] as const).map((severity) => (
                  <button
                    key={severity}
                    onClick={() => toggleFilter('severity', severity)}
                    className={`px-3 py-1 rounded-full text-sm border transition ${
                      filters.severity?.includes(severity)
                        ? severityColors[severity]
                        : 'bg-white border-gray-300 text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    {severity}
                  </button>
                ))}
              </div>
            </div>

            {/* Error Type Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Error Type</label>
              <div className="flex flex-wrap gap-2">
                {(['runtime', 'auth', 'database', 'validation', 'network', 'unknown'] as const).map((type) => {
                  const Icon = errorTypeIcons[type]
                  return (
                    <button
                      key={type}
                      onClick={() => toggleFilter('errorType', type)}
                      className={`px-3 py-1 rounded-lg text-sm border transition flex items-center gap-1 ${
                        filters.errorType?.includes(type)
                          ? 'bg-blue-50 border-blue-300 text-blue-700'
                          : 'bg-white border-gray-300 text-gray-600 hover:bg-gray-50'
                      }`}
                    >
                      <Icon className="w-3 h-3" />
                      {type}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Date Range Filter */}
            <div className="flex gap-4">
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-2">Start Date</label>
                <input
                  type="datetime-local"
                  value={filters.startDate || ''}
                  onChange={(e) => handleFilterChange('startDate', e.target.value || undefined)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-2">End Date</label>
                <input
                  type="datetime-local"
                  value={filters.endDate || ''}
                  onChange={(e) => handleFilterChange('endDate', e.target.value || undefined)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* Clear Filters */}
            <div className="flex justify-end">
              <button
                onClick={() => {
                  setFilters({ limit: pageSize, offset: 0 })
                  setSearchQuery('')
                  setPage(0)
                }}
                className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900 transition"
              >
                Clear all filters
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Error message */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
          <XCircle className="w-5 h-5 text-red-600 mt-0.5" />
          <div>
            <h3 className="font-medium text-red-900">Error loading logs</h3>
            <p className="text-sm text-red-700 mt-1">{error}</p>
          </div>
        </div>
      )}

      {/* Logs Table */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        {loading && logs.length === 0 ? (
          <div className="flex items-center justify-center py-12">
            <RefreshCw className="w-8 h-8 text-gray-400 animate-spin" />
          </div>
        ) : logs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-gray-500">
            <Info className="w-12 h-12 mb-3" />
            <p className="text-lg font-medium">No logs found</p>
            <p className="text-sm">Try adjusting your filters</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Timestamp
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Severity
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Type
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Error
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    User
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Flags
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {logs.map((log) => {
                  const ErrorIcon = errorTypeIcons[log.error_type] || Bug
                  const isExpanded = expandedLogId === log.id

                  return (
                    <>
                      <tr key={log.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">
                          <div className="flex items-center gap-2">
                            <Calendar className="w-4 h-4 text-gray-400" />
                            <span>{formatDistanceToNow(new Date(log.created_at), { addSuffix: true })}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium border ${severityColors[log.severity]}`}>
                            {log.severity}
                          </span>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <ErrorIcon className="w-4 h-4 text-gray-500" />
                            <span className="text-sm text-gray-700">{log.error_type}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="max-w-md">
                            <p className="text-sm text-gray-900 truncate">{log.error_message}</p>
                            {log.request_path && (
                              <p className="text-xs text-gray-500 mt-1">{log.request_method} {log.request_path}</p>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm">
                          {log.user_email ? (
                            <div className="flex items-center gap-2">
                              <User className="w-4 h-4 text-gray-400" />
                              <span className="text-gray-700">{log.user_email}</span>
                            </div>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="flex gap-1">
                            {log.is_supabase_getuser_error && (
                              <span className="px-2 py-1 bg-orange-100 text-orange-800 text-xs rounded border border-orange-300">
                                getUser()
                              </span>
                            )}
                            {log.is_auth_error && !log.is_supabase_getuser_error && (
                              <span className="px-2 py-1 bg-red-100 text-red-800 text-xs rounded border border-red-300">
                                Auth
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <button
                            onClick={() => toggleExpand(log.id)}
                            className="text-blue-600 hover:text-blue-800 transition"
                          >
                            {isExpanded ? (
                              <ChevronUp className="w-5 h-5" />
                            ) : (
                              <ChevronDown className="w-5 h-5" />
                            )}
                          </button>
                        </td>
                      </tr>

                      {/* Expanded Row */}
                      {isExpanded && (
                        <tr key={`${log.id}-expanded`} className="bg-gray-50">
                          <td colSpan={7} className="px-4 py-4">
                            <div className="space-y-4">
                              {/* Error Name */}
                              {log.error_name && (
                                <div>
                                  <h4 className="text-sm font-medium text-gray-700 mb-1">Error Type</h4>
                                  <code className="text-sm bg-gray-100 px-2 py-1 rounded">{log.error_name}</code>
                                </div>
                              )}

                              {/* Stack Trace */}
                              {log.error_stack && (
                                <div>
                                  <h4 className="text-sm font-medium text-gray-700 mb-2">Stack Trace</h4>
                                  <pre className="bg-gray-900 text-gray-100 p-3 rounded-lg overflow-x-auto text-xs">
                                    {log.error_stack}
                                  </pre>
                                </div>
                              )}

                              {/* Context */}
                              {log.context && Object.keys(log.context).length > 0 && (
                                <div>
                                  <h4 className="text-sm font-medium text-gray-700 mb-2">Context</h4>
                                  <div className="bg-gray-100 p-3 rounded-lg">
                                    <pre className="text-xs overflow-x-auto">
                                      {JSON.stringify(log.context, null, 2)}
                                    </pre>
                                  </div>
                                </div>
                              )}

                              {/* Request Info */}
                              {(log.ip_address || log.user_agent) && (
                                <div className="grid grid-cols-2 gap-4 text-sm">
                                  {log.ip_address && (
                                    <div>
                                      <span className="font-medium text-gray-700">IP:</span>{' '}
                                      <span className="text-gray-600">{log.ip_address}</span>
                                    </div>
                                  )}
                                  {log.user_agent && (
                                    <div>
                                      <span className="font-medium text-gray-700">User Agent:</span>{' '}
                                      <span className="text-gray-600 truncate block">{log.user_agent}</span>
                                    </div>
                                  )}
                                </div>
                              )}

                              {/* Sentry Link */}
                              {log.sentry_event_id && (
                                <div className="flex items-center gap-2 text-sm">
                                  <span className="font-medium text-gray-700">Sentry Event:</span>
                                  <a
                                    href={`https://sentry.io/issues/${log.sentry_event_id}/`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-blue-600 hover:text-blue-800"
                                  >
                                    {log.sentry_event_id}
                                  </a>
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination */}
      {logs.length >= pageSize && (
        <div className="flex items-center justify-between bg-white rounded-lg border border-gray-200 p-4">
          <button
            onClick={() => setPage(p => Math.max(0, p - 1))}
            disabled={page === 0 || loading}
            className="px-4 py-2 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition"
          >
            Previous
          </button>
          <span className="text-sm text-gray-600">
            Page {page + 1}
          </span>
          <button
            onClick={() => setPage(p => p + 1)}
            disabled={logs.length < pageSize || loading}
            className="px-4 py-2 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition"
          >
            Next
          </button>
        </div>
      )}
    </div>
  )
}
