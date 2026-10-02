const CONTACT_URL = 'https://itsjeevanvarghese.web.app/contact';
let activeDialog: Promise<boolean> | null = null;

function showDialog(appName: string, message: string, allowRequest: boolean): Promise<boolean> {
  return new Promise((resolve) => {
    const dialog = document.createElement('dialog');
    dialog.setAttribute('aria-label', `${appName} access request`);
    dialog.style.cssText = 'border:0;border-radius:18px;padding:0;max-width:440px;width:calc(100% - 32px);box-shadow:0 24px 80px rgba(15,23,42,.28);font-family:system-ui,sans-serif;color:#0f172a';
    dialog.innerHTML = `<div style="padding:24px"><h2 style="margin:0 0 10px;font-size:21px">Application access required</h2><p style="margin:0 0 20px;line-height:1.55;color:#475569">${message}</p><div style="display:flex;gap:10px;justify-content:flex-end;flex-wrap:wrap"><a href="${CONTACT_URL}" target="_blank" rel="noopener noreferrer" style="padding:10px 14px;color:#2563eb;text-decoration:none;font-weight:600">Contact developer</a><button data-close style="padding:10px 14px;border:1px solid #cbd5e1;border-radius:10px;background:white;color:#0f172a;font-weight:600;cursor:pointer">${allowRequest ? 'Not now' : 'Close'}</button>${allowRequest ? '<button data-request style="padding:10px 14px;border:0;border-radius:10px;background:#2563eb;color:white;font-weight:700;cursor:pointer">Send access request</button>' : ''}</div></div>`;
    document.body.appendChild(dialog);
    dialog.addEventListener('close', () => { const accepted = dialog.returnValue === 'request'; dialog.remove(); resolve(accepted); }, { once: true });
    dialog.querySelector<HTMLButtonElement>('[data-close]')!.onclick = () => dialog.close('close');
    const requestButton = dialog.querySelector<HTMLButtonElement>('[data-request]');
    if (requestButton) requestButton.onclick = () => dialog.close('request');
    dialog.addEventListener('cancel', (event) => { event.preventDefault(); dialog.close('close'); });
    dialog.showModal();
  });
}

function showWaitingDialog(appName: string, message: string): Promise<'check' | 'close'> {
  return new Promise((resolve) => {
    const dialog = document.createElement('dialog');
    dialog.setAttribute('aria-label', `${appName} approval status`);
    dialog.style.cssText = 'border:0;border-radius:18px;padding:0;max-width:460px;width:calc(100% - 32px);box-shadow:0 24px 80px rgba(15,23,42,.28);font-family:system-ui,sans-serif;color:#0f172a';
    dialog.innerHTML = `<div style="padding:24px"><h2 style="margin:0 0 10px;font-size:21px">Waiting for administrator approval</h2><p style="margin:0 0 20px;line-height:1.55;color:#475569">${message}</p><div style="display:flex;gap:10px;justify-content:flex-end;flex-wrap:wrap"><a href="${CONTACT_URL}" target="_blank" rel="noopener noreferrer" style="padding:10px 14px;color:#2563eb;text-decoration:none;font-weight:600">Contact developer</a><button data-close style="padding:10px 14px;border:1px solid #cbd5e1;border-radius:10px;background:white;color:#0f172a;font-weight:600;cursor:pointer">Close</button><button data-check style="padding:10px 14px;border:0;border-radius:10px;background:#2563eb;color:white;font-weight:700;cursor:pointer">Check again</button></div></div>`;
    document.body.appendChild(dialog);
    dialog.addEventListener('close', () => { const action = dialog.returnValue === 'check' ? 'check' : 'close'; dialog.remove(); resolve(action); }, { once: true });
    dialog.querySelector<HTMLButtonElement>('[data-close]')!.onclick = () => dialog.close('close');
    dialog.querySelector<HTMLButtonElement>('[data-check]')!.onclick = () => dialog.close('check');
    dialog.addEventListener('cancel', (event) => { event.preventDefault(); dialog.close('close'); });
    dialog.showModal();
  });
}

async function waitForApproval(options: { appName: string; checkAccess: () => Promise<unknown> }, initialMessage: string): Promise<boolean> {
  let message = initialMessage;
  while (true) {
    const action = await showWaitingDialog(options.appName, message);
    if (action === 'close') return false;
    const result = await options.checkAccess() as { allowed?: boolean; requestStatus?: string } | undefined;
    if (result?.allowed === true) return true;
    message = result?.requestStatus === 'rejected'
      ? 'Your request was not approved. Contact the developer if you need the decision reviewed.'
      : 'Approval is still pending. Please wait for administrator approval, then select Check again.';
  }
}

export function offerAccessRequest(options: { appName: string; requestStatus?: unknown; sendRequest: () => Promise<unknown>; checkAccess: () => Promise<unknown> }): Promise<boolean> {
  if (activeDialog) return activeDialog;
  activeDialog = (async () => {
    if (options.requestStatus === 'pending') return waitForApproval(options, 'Your access request is pending. Please wait for administrator approval, then select Check again.');
    if (options.requestStatus === 'rejected') { await showDialog(options.appName, 'Your access request was not approved. Contact the developer if you need the decision reviewed.', false); return false; }
    if (options.requestStatus === 'approved') { await showDialog(options.appName, 'Access was approved, but the account or application is currently inactive. Contact the developer for help.', false); return false; }
    const accepted = await showDialog(options.appName, `Your account is not approved for ${options.appName}. Would you like to send an access request to the administrator?`, true);
    if (!accepted) return false;
    const result = await options.sendRequest() as { status?: string } | undefined;
    if (result?.status === 'approved' || result?.status === 'already-approved') return true;
    if (result?.status === 'rejected') {
      await showDialog(options.appName, 'Your earlier request was rejected. Contact the developer if you need the decision reviewed.', false);
      return false;
    }
    return waitForApproval(options, 'Access request sent. Please wait for administrator approval, then select Check again.');
  })().finally(() => { activeDialog = null; });
  return activeDialog;
}
