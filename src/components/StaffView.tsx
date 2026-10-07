import React, { useState, useEffect } from 'react';
import { StaffMember, User } from '../types';
import { ApiClient } from '../utils/api';
import { 
  Users, Shield, Lock, ShieldCheck, Plus, 
  Trash2, Edit2, Key, Mail, Phone, ArrowLeft, X 
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import Spinner from './ui/Spinner';

interface StaffViewProps {
  currentUser: User | null;
  showToast: (msg: string, type?: 'success' | 'error' | 'warning') => void;
}

export default function StaffView({ currentUser, showToast }: StaffViewProps) {
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(true);

  // Check if owner
  const isOwner = currentUser?.tenant_role === 'owner';

  // Modal / Form triggers
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingMember, setEditingMember] = useState<StaffMember | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  // Form Fields
  const [formName, setFormName] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formRole, setFormRole] = useState<'manager' | 'staff'>('staff');
  const [formPassword, setFormPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const loadStaffMembers = async () => {
    setLoading(true);
    try {
      const data = await ApiClient.getStaff();
      setStaff(data);
    } catch (e: any) {
      showToast(e.message || "Failed to fetch staff accounts", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStaffMembers();
  }, []);

  // Trigger Edit Form
  const triggerEdit = (member: StaffMember) => {
    if (!isOwner) {
      showToast("Access Restricted. Only the store owner can edit staff roles.", "warning");
      return;
    }
    // Cannot edit owner profile from staff panel
    if (member.tenant_role === 'owner') {
      showToast("Owner accounts cannot be modified here. Check Settings for personal updates.", "warning");
      return;
    }
    setEditingMember(member);
    setFormName(member.name);
    setFormEmail(member.email);
    setFormPhone(member.phone || '');
    setFormRole(member.tenant_role === 'manager' ? 'manager' : 'staff');
    setFormPassword(''); // blank out passwords on edit
    setIsFormOpen(true);
  };

  // Trigger Create Form
  const triggerCreate = () => {
    if (!isOwner) {
      showToast("Access Restricted. Only the store owner can add new staff accounts.", "warning");
      return;
    }
    setEditingMember(null);
    setFormName('');
    setFormEmail('');
    setFormPhone('');
    setFormRole('staff');
    setFormPassword('');
    setIsFormOpen(true);
  };

  // Confirm delete revoke
  const confirmRevoke = async () => {
    if (!deletingId) return;
    try {
      await ApiClient.deleteStaff(deletingId);
      showToast("Staff access credentials permanently revoked", "success");
      setDeletingId(null);
      loadStaffMembers();
    } catch (e: any) {
      showToast(e.message || "Revocation failed", "error");
    }
  };

  // Submit Handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isOwner) return;

    if (!formName || !formEmail) {
      showToast("Name and Email are required properties", "warning");
      return;
    }

    if (!editingMember && !formPassword) {
      showToast("Password is required for new staff registration", "warning");
      return;
    }

    setSubmitting(true);
    const payload = {
      name: formName,
      email: formEmail,
      phone: formPhone || null,
      tenant_role: formRole,
      password: formPassword || null
    };

    try {
      await ApiClient.saveStaff(payload, editingMember?.id);
      showToast(editingMember ? "Staff privileges successfully saved!" : "New staff credentials created!", "success");
      setIsFormOpen(false);
      loadStaffMembers();
    } catch (e: any) {
      showToast(e.message || "Failed to save staff credentials", "error");
    } finally {
      setSubmitting(false);
    }
  };

  const getRoleBadgeStyle = (role: string) => {
    switch (role) {
      case 'owner': return 'bg-emerald-500/10 text-success-green border-emerald-500/25';
      case 'manager': return 'bg-amber-500/10 text-accent-amber border-amber-500/25';
      default: return 'bg-blue-500/10 text-blue-400 border-blue-500/25';
    }
  };

  // 1. BLOCKED RESTRICTED LOCK COVER FOR MANAGERS & STAFF
  if (!isOwner && !loading) {
    return (
      <div className="bg-bg-card border border-total-red/25 rounded-2xl p-8 text-center space-y-4 max-w-lg mx-auto mt-8">
        <div className="w-14 h-14 rounded-full bg-total-red/10 border border-total-red/20 flex items-center justify-center text-total-red mx-auto animate-pulse">
          <Lock size={26} />
        </div>
        <h2 className="font-serif font-bold text-text-main text-lg">Owner-Only Panel Locked</h2>
        <p className="text-xs text-text-body-muted leading-relaxed">
          Access to staff rosters, administrative login credentials, and user privilege delegations is strictly restricted to the registered <span className="font-bold text-text-main uppercase font-mono">Store Owner</span>.
        </p>
        <div className="bg-bg-primary p-3 rounded-xl text-xs text-text-body-muted font-mono inline-block">
          Your active role: <span className="text-accent-amber font-bold uppercase">{currentUser?.tenant_role}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-20">
      
      <AnimatePresence mode="wait">
        {!isFormOpen ? (
          // LIST VIEW
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="space-y-5"
          >
            {/* Title & ADD */}
            <div className="flex justify-between items-center bg-bg-card border border-border-card/60 rounded-2xl p-4.5">
              <div>
                <h1 className="font-serif font-bold text-xl text-text-main tracking-tight">Staff & Permissions</h1>
                <p className="text-xs text-text-body-muted mt-0.5">
                  Define login roles, manager keys, and floor access
                  {staff.length > 0 && (
                    <span className="ml-1.5 font-mono text-accent-amber">({staff.length} registered)</span>
                  )}
                </p>
              </div>

              <button 
                onClick={triggerCreate}
                className="px-4 py-2.5 bg-btn-primary hover:bg-btn-primary-hover text-white text-xs font-bold rounded-xl flex items-center gap-1.5 cursor-pointer shadow-lg shadow-btn-primary/15 transition-colors"
              >
                <Plus size={14} /> Register Staff
              </button>
            </div>

            {/* Staff list */}
            {loading ? (
              <Spinner size="lg" label="Querying privilege database..." />
            ) : staff.length === 0 ? (
              <div className="bg-bg-card/40 border border-border-card/30 rounded-2xl p-12 text-center text-text-body-muted flex flex-col items-center">
                <Users size={40} className="stroke-[1.2] text-border-card mb-3" />
                <h3 className="font-serif font-bold text-text-main text-base">Roster Vacant</h3>
                <p className="text-xs text-text-body-muted mt-1 max-w-xs leading-relaxed">
                  Delegate tasks by registering manager and staff logins for order packagers.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {staff.map((member) => {
                  const isSelf = member.id === currentUser?.id;
                  return (
                    <div 
                      key={member.id}
                      className="bg-bg-card border border-border-card/60 rounded-2xl p-4.5 flex flex-col justify-between relative shadow-md overflow-hidden"
                    >
                      {/* Role indicator top strip */}
                      <div className={`absolute top-0 left-0 w-full h-1 ${
                        member.tenant_role === 'owner' ? 'bg-btn-primary' : member.tenant_role === 'manager' ? 'bg-accent-amber' : 'bg-blue-500'
                      }`} />

                      <div>
                        {/* Header Role info */}
                        <div className="flex justify-between items-start mb-3">
                          <span className={`text-[9px] font-mono font-bold uppercase tracking-widest border px-2.5 py-0.5 rounded-full ${getRoleBadgeStyle(member.tenant_role)}`}>
                            {member.tenant_role}
                          </span>
                          {isSelf && (
                            <span className="text-[10px] font-mono text-text-body-muted font-bold bg-white/5 px-2 py-0.5 rounded border border-border-card">
                              You
                            </span>
                          )}
                        </div>

                        {/* Name and contacts */}
                        <h3 className="text-base font-bold text-text-main">{member.name}</h3>
                        
                        <div className="space-y-1.5 mt-3 text-xs text-text-body-muted">
                          <div className="flex items-center gap-2">
                            <Mail size={13} className="text-accent-amber" />
                            <span>{member.email}</span>
                          </div>
                          {member.phone && (
                            <div className="flex items-center gap-2 font-mono text-[11px]">
                              <Phone size={13} className="text-accent-amber" />
                              <span>{member.phone}</span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Action buttons (only owner can modify other managers/staff) */}
                      {member.tenant_role !== 'owner' && (
                        <div className="flex justify-end gap-2.5 mt-4 pt-3 border-t border-border-card/30">
                          <button 
                            onClick={() => triggerEdit(member)}
                            className="p-1.5 rounded-lg border border-border-card bg-bg-primary text-xs text-text-main font-bold flex items-center gap-1 cursor-pointer hover:bg-white/2"
                          >
                            <Edit2 size={11} /> Edit Roles
                          </button>
                          <button 
                            onClick={() => setDeletingId(member.id)}
                            className="p-1.5 rounded-lg border border-rose-900/50 bg-total-red/5 text-xs text-total-red font-bold flex items-center gap-1 cursor-pointer hover:bg-total-red/10"
                          >
                            <Trash2 size={11} /> Revoke
                          </button>
                        </div>
                      )}

                    </div>
                  );
                })}
              </div>
            )}
          </motion.div>
        ) : (
          // REGISTER / EDIT FORM
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="bg-bg-card border border-border-card/60 rounded-2xl p-5"
          >
            {/* Title */}
            <div className="flex items-center gap-3 mb-6 pb-4 border-b border-border-card/40">
              <button 
                onClick={() => setIsFormOpen(false)}
                className="p-2 bg-bg-primary border border-border-card text-text-body-muted hover:text-text-main rounded-xl active:scale-95 transition-transform cursor-pointer"
              >
                <ArrowLeft size={16} />
              </button>
              <div>
                <h2 className="font-serif font-bold text-lg text-text-main">
                  {editingMember ? 'Modify Access Roles' : 'Register Store Staff member'}
                </h2>
                <p className="text-[11px] text-text-body-muted mt-0.5">
                  {editingMember ? `Editing account privileges for #${editingMember.id}` : 'Create secure logins for order managers'}
                </p>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Name */}
              <div>
                <label className="block text-xs font-bold text-text-text-main mb-1.5 uppercase font-mono tracking-wider">Staff Full Name *</label>
                <input 
                  type="text" required value={formName} onChange={(e) => setFormName(e.target.value)}
                  placeholder="e.g. Hammad Khan"
                  className="w-full bg-bg-primary border border-border-card rounded-xl px-4 py-2.5 text-xs text-text-main outline-none focus:border-accent-amber"
                />
              </div>

              {/* Email and Phone */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-text-text-main mb-1.5 uppercase font-mono tracking-wider">Login Email *</label>
                  <input 
                    type="email" required value={formEmail} onChange={(e) => setFormEmail(e.target.value)}
                    placeholder="hammad@asandukan.online"
                    className="w-full bg-bg-primary border border-border-card rounded-xl px-4 py-2.5 text-xs text-text-main outline-none focus:border-accent-amber"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-text-text-main mb-1.5 uppercase font-mono tracking-wider">Contact Phone</label>
                  <input 
                    type="text" value={formPhone} onChange={(e) => setFormPhone(e.target.value)}
                    placeholder="+923318902183"
                    className="w-full bg-bg-primary border border-border-card rounded-xl px-4 py-2.5 text-xs text-text-main outline-none focus:border-accent-amber font-mono"
                  />
                </div>
              </div>

              {/* Role Picker selection */}
              <div>
                <label className="block text-xs font-bold text-text-text-main mb-1.5 uppercase font-mono tracking-wider">Assigned Roster Role *</label>
                <div className="grid grid-cols-2 bg-bg-primary border border-border-card p-1 rounded-xl">
                  <button
                    type="button"
                    onClick={() => setFormRole('manager')}
                    className={`py-2 rounded-lg text-xs font-bold cursor-pointer transition-all ${
                      formRole === 'manager' 
                        ? 'bg-btn-primary text-white' 
                        : 'text-text-body-muted hover:text-white'
                    }`}
                  >
                    Manager (Orders, Products & Coupons)
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormRole('staff')}
                    className={`py-2 rounded-lg text-xs font-bold cursor-pointer transition-all ${
                      formRole === 'staff' 
                        ? 'bg-btn-primary text-white' 
                        : 'text-text-body-muted hover:text-white'
                    }`}
                  >
                    Staff Assistant (View Only / Read Logs)
                  </button>
                </div>
              </div>

              {/* Password credentials */}
              <div>
                <label className="block text-xs font-bold text-text-text-main mb-1.5 uppercase font-mono tracking-wider">
                  {editingMember ? 'Reset Password (Omit to keep current)' : 'Access Login Password *'}
                </label>
                <div className="relative">
                  <Key size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-body-muted" />
                  <input 
                    type="password"
                    required={!editingMember}
                    placeholder={editingMember ? "Enter new staff access code" : "Configure initial secure login password"}
                    value={formPassword}
                    onChange={(e) => setFormPassword(e.target.value)}
                    className="w-full bg-bg-primary border border-border-card rounded-xl pl-10 pr-4 py-2.5 text-xs text-text-main outline-none focus:border-accent-amber font-mono"
                  />
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-4 border-t border-border-card/40 flex gap-3">
                <button
                  type="button"
                  onClick={() => setIsFormOpen(false)}
                  className="flex-1 py-2.5 bg-bg-primary border border-btn-secondary-border rounded-xl text-xs font-bold text-white hover:bg-black/20 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 py-2.5 bg-btn-primary hover:bg-btn-primary-hover text-white text-xs font-bold rounded-xl active:scale-95 transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-lg shadow-btn-primary/15"
                >
                  {submitting && <div className="w-3.5 h-3.5 border-2 border-white/20 border-t-white rounded-full animate-spin" />}
                  {editingMember ? 'Save Privileges' : 'Register Account'}
                </button>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      {/* CONFIRM REVOCATION DIALOG */}
      <AnimatePresence>
        {deletingId !== null && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/85 z-50 flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.92, y: 15 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.92, y: 15 }}
              className="w-full max-w-sm bg-bg-card border border-total-red/20 rounded-2xl p-5 shadow-2xl text-center"
            >
              <div className="w-12 h-12 rounded-full bg-total-red/10 border border-total-red/20 flex items-center justify-center text-total-red mx-auto mb-3.5">
                <Shield size={22} className="animate-pulse" />
              </div>
              <h3 className="font-serif font-bold text-text-main text-lg">Revoke Staff Login?</h3>
              <p className="text-xs text-text-body-muted mt-2 leading-relaxed">
                This will immediately deactivate Hammad's login credentials. They will be locked out of the merchant portal and won't be able to fulfill orders.
              </p>

              <div className="mt-5 flex gap-3">
                <button
                  onClick={() => setDeletingId(null)}
                  className="flex-1 px-4 py-2 bg-bg-primary border border-btn-secondary-border text-xs font-bold rounded-xl text-text-main hover:bg-bg-card cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmRevoke}
                  className="flex-1 px-4 py-2 bg-total-red hover:bg-total-red/20 text-white text-xs font-bold rounded-xl cursor-pointer"
                >
                  Revoke Privileges
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      
    </div>
  );
}
