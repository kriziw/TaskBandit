import { useEffect, useState } from 'react';
import { taskBanditApi, TaskBanditApiError } from '../../api/taskbanditApi';
import type {
  BetaSignupRequest,
  BetaSignupSettings,
  BetaSignupStatus,
  GraduateBetaTenantsResult,
} from '../../types/taskbandit';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

const STATUS_LABELS: Record<BetaSignupStatus, string> = {
  PENDING: 'Pending',
  APPROVED: 'Approved',
  REJECTED: 'Rejected',
};

const STATUS_CLASS: Record<BetaSignupStatus, string> = {
  PENDING: 'state-pending_approval',
  APPROVED: 'state-completed',
  REJECTED: 'state-cancelled',
};

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

type Props = {
  internalToken: string;
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function BetaSignupRequestsPanel({ internalToken }: Props) {
  const [requests, setRequests] = useState<BetaSignupRequest[]>([]);
  const [settings, setSettings] = useState<BetaSignupSettings | null>(null);
  const [statusFilter, setStatusFilter] = useState<BetaSignupStatus | 'ALL'>('PENDING');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  // Settings editing
  const [settingsDraft, setSettingsDraft] = useState('');
  const [isSavingSettings, setIsSavingSettings] = useState(false);

  // Per-request state
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [approvingId, setApprovingId] = useState<string | null>(null);
  const [approvePackage, setApprovePackage] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);

  // Graduate modal
  const [showGraduateModal, setShowGraduateModal] = useState(false);
  const [graduatePackage, setGraduatePackage] = useState('');
  const [graduateResult, setGraduateResult] = useState<GraduateBetaTenantsResult | null>(null);
  const [isGraduating, setIsGraduating] = useState(false);

  // Token entry
  const [tokenInput, setTokenInput] = useState(internalToken);
  const [effectiveToken, setEffectiveToken] = useState(internalToken);

  useEffect(() => {
    void loadData(effectiveToken);
  }, [effectiveToken, statusFilter]); // eslint-disable-line react-hooks/exhaustive-deps

  async function loadData(token: string) {
    setIsLoading(true);
    setError(null);
    try {
      const [reqs, sett] = await Promise.all([
        taskBanditApi.listBetaSignupRequests(
          token,
          statusFilter === 'ALL' ? undefined : statusFilter,
        ),
        taskBanditApi.getBetaSignupSettings(token),
      ]);
      setRequests(reqs);
      setSettings(sett);
      setSettingsDraft(sett.defaultPackageCode);
      setApprovePackage(sett.defaultPackageCode);
      setGraduatePackage(sett.defaultPackageCode);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load beta signup data.');
    } finally {
      setIsLoading(false);
    }
  }

  function showNotice(msg: string) {
    setNotice(msg);
    setTimeout(() => setNotice(null), 4000);
  }

  async function handleSaveSettings() {
    setIsSavingSettings(true);
    try {
      const updated = await taskBanditApi.updateBetaSignupSettings(effectiveToken, settingsDraft);
      setSettings({ ...updated, availablePackages: settings?.availablePackages ?? [] });
      showNotice('Default package saved.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save settings.');
    } finally {
      setIsSavingSettings(false);
    }
  }

  async function handleApprove(id: string) {
    setBusyId(id);
    try {
      await taskBanditApi.reviewBetaSignupRequest(
        effectiveToken,
        id,
        'approve',
        approvePackage || undefined,
      );
      setApprovingId(null);
      showNotice('Request approved — invite email sent.');
      void loadData(effectiveToken);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to approve request.');
    } finally {
      setBusyId(null);
    }
  }

  async function handleReject(id: string) {
    setBusyId(id);
    try {
      await taskBanditApi.reviewBetaSignupRequest(
        effectiveToken,
        id,
        'reject',
        undefined,
        rejectionReason || undefined,
      );
      setRejectingId(null);
      setRejectionReason('');
      showNotice('Request rejected.');
      void loadData(effectiveToken);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to reject request.');
    } finally {
      setBusyId(null);
    }
  }

  async function handleChangePackage(id: string, packageCode: string) {
    setBusyId(id);
    try {
      await taskBanditApi.updateBetaTenantPackage(effectiveToken, id, packageCode);
      showNotice('Package updated.');
      void loadData(effectiveToken);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update package.');
    } finally {
      setBusyId(null);
    }
  }

  async function handleGraduate() {
    setIsGraduating(true);
    try {
      const result = await taskBanditApi.graduateBetaTenants(effectiveToken, graduatePackage);
      setGraduateResult(result);
      void loadData(effectiveToken);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to graduate tenants.');
    } finally {
      setIsGraduating(false);
    }
  }

  const availablePackages = settings?.availablePackages ?? ['free'];

  return (
    <article className="panel page-panel page-admin">
      <div className="section-heading">
        <h2>Beta Signup Requests</h2>
        <span className="section-kicker">
          {requests.filter((r) => r.status === 'PENDING').length} pending
        </span>
      </div>

      {/* Token entry (if not pre-configured) */}
      {!internalToken && (
        <div className="settings-section" style={{ marginBottom: '1rem' }}>
          <label>
            <span>Internal service token</span>
            <input
              type="password"
              value={tokenInput}
              onChange={(e) => setTokenInput(e.target.value)}
              placeholder="Paste your x-internal-service-token"
            />
          </label>
          <div className="button-row">
            <button
              className="secondary-button"
              type="button"
              onClick={() => setEffectiveToken(tokenInput)}
            >
              Connect
            </button>
          </div>
        </div>
      )}

      {/* Settings */}
      {settings && (
        <div className="settings-section" style={{ marginBottom: '1.5rem' }}>
          <h3 style={{ marginBottom: '0.5rem' }}>Default package for new approvals</h3>
          <div className="button-row">
            <select
              value={settingsDraft}
              onChange={(e) => setSettingsDraft(e.target.value)}
            >
              {availablePackages.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
            <button
              className="secondary-button"
              type="button"
              disabled={isSavingSettings || settingsDraft === settings.defaultPackageCode}
              onClick={() => void handleSaveSettings()}
            >
              {isSavingSettings ? 'Saving…' : 'Save'}
            </button>
          </div>
        </div>
      )}

      {/* Filter tabs */}
      <div className="button-row" style={{ marginBottom: '1rem' }}>
        {(['ALL', 'PENDING', 'APPROVED', 'REJECTED'] as const).map((s) => (
          <button
            key={s}
            className={statusFilter === s ? 'primary-button' : 'ghost-button'}
            type="button"
            onClick={() => setStatusFilter(s)}
          >
            {s === 'ALL' ? 'All' : STATUS_LABELS[s]}
          </button>
        ))}
      </div>

      {/* Bulk graduate */}
      {(statusFilter === 'ALL' || statusFilter === 'APPROVED') && (
        <div style={{ marginBottom: '1rem' }}>
          <button
            className="secondary-button"
            type="button"
            onClick={() => {
              setGraduateResult(null);
              setShowGraduateModal(true);
            }}
          >
            Graduate from beta…
          </button>
        </div>
      )}

      {/* Graduate modal */}
      {showGraduateModal && (
        <div className="panel" style={{ marginBottom: '1rem', padding: '1rem' }}>
          <h3>Graduate beta tenants</h3>
          <p className="inline-message">
            All beta tenants will have their package updated to the selected package. This will also
            clear the beta flag.
          </p>
          <label>
            <span>Target package</span>
            <select
              value={graduatePackage}
              onChange={(e) => setGraduatePackage(e.target.value)}
            >
              {availablePackages.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </label>
          {graduateResult && (
            <div style={{ marginTop: '0.5rem' }}>
              <p className="inline-message">
                Succeeded: {graduateResult.succeeded.length} · Failed:{' '}
                {graduateResult.failed.length}
              </p>
              {graduateResult.failed.length > 0 && (
                <ul>
                  {graduateResult.failed.map((f) => (
                    <li key={f.tenantId} className="inline-message error-text">
                      {f.tenantId}: {f.reason}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
          <div className="button-row" style={{ marginTop: '0.75rem' }}>
            <button
              className="primary-button"
              type="button"
              disabled={isGraduating}
              onClick={() => void handleGraduate()}
            >
              {isGraduating ? 'Graduating…' : 'Graduate'}
            </button>
            <button
              className="ghost-button"
              type="button"
              onClick={() => {
                setShowGraduateModal(false);
                setGraduateResult(null);
              }}
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* Notices / errors */}
      {notice && <p className="inline-message">{notice}</p>}
      {error && <p className="inline-message error-text">{error}</p>}

      {/* Requests list */}
      {isLoading ? (
        <p className="inline-message">Loading…</p>
      ) : requests.length === 0 ? (
        <p className="empty-state">
          {statusFilter === 'PENDING' ? 'No pending requests.' : 'No requests found.'}
        </p>
      ) : (
        <div className="stack-list">
          {requests.map((req) => (
            <div className="task-row" key={req.id}>
              <div className="task-row-header">
                <div>
                  <strong>{req.displayName}</strong>
                  <p className="inline-message">{req.email}</p>
                </div>
                <span className={`status-pill ${STATUS_CLASS[req.status]}`}>
                  {STATUS_LABELS[req.status]}
                </span>
              </div>

              <p>
                <strong>Household:</strong> {req.householdName}
                {req.householdSizeEstimate ? ` (${req.householdSizeEstimate} people)` : ''}
              </p>
              <p>
                <strong>Phone:</strong> {req.phone}
              </p>
              <p>
                <strong>Address:</strong> {req.billingCity}, {req.billingCountry}
              </p>
              <p>
                <strong>Submitted:</strong> {formatDate(req.createdAtUtc)}
              </p>
              {req.packageCode && (
                <p>
                  <strong>Package:</strong> {req.packageCode}
                </p>
              )}

              {/* Expand to see full address + message */}
              <div style={{ marginTop: '0.25rem' }}>
                <button
                  className="ghost-button"
                  type="button"
                  style={{ fontSize: '0.85em' }}
                  onClick={() => setExpandedId(expandedId === req.id ? null : req.id)}
                >
                  {expandedId === req.id ? 'Hide details' : 'Show details'}
                </button>
              </div>
              {expandedId === req.id && (
                <div style={{ marginTop: '0.5rem', fontSize: '0.9em' }}>
                  <p>
                    <strong>Full address:</strong> {req.billingAddressLine1}, {req.billingCity},{' '}
                    {req.billingPostalCode}, {req.billingCountry}
                  </p>
                  {req.message && (
                    <p>
                      <strong>Message:</strong> {req.message}
                    </p>
                  )}
                  {req.rejectionReason && (
                    <p>
                      <strong>Rejection reason:</strong> {req.rejectionReason}
                    </p>
                  )}
                  {req.provisionedTenantId && (
                    <p>
                      <strong>Tenant ID:</strong> <code>{req.provisionedTenantId}</code>
                    </p>
                  )}
                </div>
              )}

              {/* Actions */}
              {req.status === 'PENDING' && (
                <div style={{ marginTop: '0.75rem' }}>
                  {approvingId === req.id ? (
                    <div className="button-row">
                      <select
                        value={approvePackage}
                        onChange={(e) => setApprovePackage(e.target.value)}
                      >
                        {availablePackages.map((p) => (
                          <option key={p} value={p}>
                            {p}
                          </option>
                        ))}
                      </select>
                      <button
                        className="primary-button"
                        type="button"
                        disabled={busyId === req.id}
                        onClick={() => void handleApprove(req.id)}
                      >
                        {busyId === req.id ? 'Approving…' : 'Confirm approve'}
                      </button>
                      <button
                        className="ghost-button"
                        type="button"
                        onClick={() => setApprovingId(null)}
                      >
                        Cancel
                      </button>
                    </div>
                  ) : rejectingId === req.id ? (
                    <div>
                      <input
                        type="text"
                        placeholder="Rejection reason (optional)"
                        value={rejectionReason}
                        onChange={(e) => setRejectionReason(e.target.value)}
                        maxLength={500}
                        style={{ marginBottom: '0.5rem', width: '100%' }}
                      />
                      <div className="button-row">
                        <button
                          className="danger-button"
                          type="button"
                          disabled={busyId === req.id}
                          onClick={() => void handleReject(req.id)}
                        >
                          {busyId === req.id ? 'Rejecting…' : 'Confirm reject'}
                        </button>
                        <button
                          className="ghost-button"
                          type="button"
                          onClick={() => {
                            setRejectingId(null);
                            setRejectionReason('');
                          }}
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="button-row">
                      <button
                        className="primary-button"
                        type="button"
                        onClick={() => {
                          setApprovePackage(settings?.defaultPackageCode ?? 'free');
                          setApprovingId(req.id);
                        }}
                      >
                        Approve
                      </button>
                      <button
                        className="ghost-button"
                        type="button"
                        onClick={() => setRejectingId(req.id)}
                      >
                        Reject
                      </button>
                    </div>
                  )}
                </div>
              )}

              {req.status === 'APPROVED' && req.provisionedTenantId && (
                <div style={{ marginTop: '0.75rem' }}>
                  <div className="button-row">
                    <span style={{ fontSize: '0.85em', alignSelf: 'center' }}>Change package:</span>
                    <select
                      defaultValue={req.packageCode ?? ''}
                      disabled={busyId === req.id}
                      onChange={(e) => void handleChangePackage(req.id, e.target.value)}
                    >
                      {availablePackages.map((p) => (
                        <option key={p} value={p}>
                          {p}
                        </option>
                      ))}
                    </select>
                    {busyId === req.id && (
                      <span className="inline-message" style={{ fontSize: '0.85em' }}>
                        Updating…
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </article>
  );
}
