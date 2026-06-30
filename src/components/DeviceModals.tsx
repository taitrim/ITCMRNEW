"use client";

import { X, Trash2 } from "lucide-react";

const DEVICE_ICONS: Record<string, string> = {
  computer: "💻", monitor: "🖥️", printer: "🖨️", network: "🌐", phone: "📱",
  peripheral: "🎮", server: "🖥️", other: "📦",
};
const DEVICE_LABELS: Record<string, string> = {
  computer: "Máy tính", monitor: "Màn hình", printer: "Máy in", network: "Mạng",
  phone: "Điện thoại", peripheral: "Ngoại vi", server: "Máy chủ", other: "Khác",
};
const STATUS_LABELS: Record<string, string> = {
  active: "Đang dùng", broken: "Hỏng", stored: "Lưu kho", retired: "Thanh lý",
};
const CONDITION_LABELS: Record<string, string> = {
  good: "Tốt", fair: "Tạm được", broken: "Hỏng", damaged: "Hư hại", other: "Khác",
};
const DEVICE_TYPES = Object.keys(DEVICE_LABELS);

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="text-[10px] text-gray-500">{label}</label>
      {children}
    </div>
  );
}

const inputCls = "w-full h-8 px-2 rounded-lg border border-gray-200 text-xs focus:outline-hidden focus:border-blue-400";

interface EditDeviceModalProps {
  form: Record<string, any>;
  set: (k: string, v: any) => void;
  onSave: () => void;
  onClose: () => void;
  employees: Record<string, any[]>;
  customerId: string;
}

export function EditDeviceModal({ form, set, onSave, onClose, employees, customerId }: EditDeviceModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-12 bg-black/30 animate-in">
      <div className="bg-white rounded-2xl w-full max-w-lg mx-4 max-h-[85vh] overflow-y-auto shadow-xl">
        <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100">
          <h3 className="font-semibold text-sm">Sửa thiết bị</h3>
          <button onClick={onClose} className="p-1 text-gray-400"><X size={18} /></button>
        </div>
        <div className="p-5 space-y-3">
          <Field label="Loại thiết bị">
            <select value={form.deviceType} onChange={(e) => set("deviceType", e.target.value)} className={inputCls}>
              {DEVICE_TYPES.map(t => <option key={t} value={t}>{DEVICE_ICONS[t]} {DEVICE_LABELS[t]}</option>)}
            </select>
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Nhãn hiệu"><input value={form.manufacturer} onChange={(e) => set("manufacturer", e.target.value)} className={inputCls} /></Field>
            <Field label="Model"><input value={form.modelName} onChange={(e) => set("modelName", e.target.value)} className={inputCls} /></Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Số serial"><input value={form.serialNumber} onChange={(e) => set("serialNumber", e.target.value)} className={inputCls} /></Field>
            <Field label="Mã tài sản"><input value={form.assetTag} onChange={(e) => set("assetTag", e.target.value)} className={inputCls} /></Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="IP"><input value={form.ipAddress} onChange={(e) => set("ipAddress", e.target.value)} className={inputCls} /></Field>
            <Field label="MAC"><input value={form.macAddress} onChange={(e) => set("macAddress", e.target.value)} className={inputCls} /></Field>
          </div>
          {form.deviceType === "computer" && (
            <>
              <div className="grid grid-cols-2 gap-3">
                <Field label="CPU"><input value={form.cpu} onChange={(e) => set("cpu", e.target.value)} className={inputCls} /></Field>
                <Field label="RAM"><input value={form.ram} onChange={(e) => set("ram", e.target.value)} className={inputCls} /></Field>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Ổ đĩa"><input value={form.disk} onChange={(e) => set("disk", e.target.value)} className={inputCls} /></Field>
                <Field label="Hệ điều hành"><input value={form.os} onChange={(e) => set("os", e.target.value)} className={inputCls} /></Field>
              </div>
            </>
          )}
          {form.deviceType === "monitor" && (
            <div className="grid grid-cols-2 gap-3">
              <Field label="Kích cỡ (inch)"><input value={form.cpu} onChange={(e) => set("cpu", e.target.value)} className={inputCls} /></Field>
              <Field label="Độ phân giải"><input value={form.ram} onChange={(e) => set("ram", e.target.value)} className={inputCls} /></Field>
            </div>
          )}
          {form.deviceType === "printer" && (
            <div className="grid grid-cols-2 gap-3">
              <Field label="Loại máy in (Laser/Ink)"><input value={form.cpu} onChange={(e) => set("cpu", e.target.value)} className={inputCls} /></Field>
              <Field label="Số hộp mực"><input value={form.ram} onChange={(e) => set("ram", e.target.value)} className={inputCls} /></Field>
            </div>
          )}
          {form.deviceType === "network" && (
            <div className="grid grid-cols-2 gap-3">
              <Field label="Loại (Switch/Router/AP)"><input value={form.cpu} onChange={(e) => set("cpu", e.target.value)} className={inputCls} /></Field>
              <Field label="Firmware"><input value={form.ram} onChange={(e) => set("ram", e.target.value)} className={inputCls} /></Field>
            </div>
          )}
          {form.deviceType === "phone" && (
            <div className="grid grid-cols-2 gap-3">
              <Field label="Firmware"><input value={form.cpu} onChange={(e) => set("cpu", e.target.value)} className={inputCls} /></Field>
              <Field label="Số điện thoại"><input value={form.ram} onChange={(e) => set("ram", e.target.value)} className={inputCls} /></Field>
            </div>
          )}
          <Field label="Vị trí"><input value={form.locationDetail} onChange={(e) => set("locationDetail", e.target.value)} className={inputCls} /></Field>
          <Field label="Gán cho nhân viên">
            <select value={form.assignedToId} onChange={(e) => set("assignedToId", e.target.value)} className={inputCls}>
              <option value="">Chưa gán</option>
              {(employees[customerId] || []).map((e: any) => (
                <option key={e.id} value={e.id}>{e.lastName || ""} {e.firstName || ""} - {e.code || ""}</option>
              ))}
            </select>
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Trạng thái">
              <select value={form.status} onChange={(e) => set("status", e.target.value)} className={inputCls}>
                {Object.entries(STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </Field>
            <Field label="Tình trạng">
              <select value={form.condition} onChange={(e) => set("condition", e.target.value)} className={inputCls}>
                {Object.entries(CONDITION_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </Field>
          </div>
          <Field label="Số lượng"><input type="number" value={form.quantity} onChange={(e) => set("quantity", parseInt(e.target.value) || 1)} className={inputCls} /></Field>
          <Field label="Ghi chú"><textarea value={form.notes} onChange={(e) => set("notes", e.target.value)} rows={2} className="w-full px-2 py-1.5 rounded-lg border border-gray-200 text-xs focus:outline-hidden focus:border-blue-400 resize-none" /></Field>
        </div>
        <div className="flex items-center gap-2 justify-end px-5 py-3 border-t border-gray-100">
          <button onClick={onClose} className="h-8 px-4 rounded-xl text-xs text-gray-600 hover:bg-gray-100">Hủy</button>
          <button onClick={onSave} className="h-8 px-4 rounded-xl bg-primary text-white text-xs font-medium">Lưu</button>
        </div>
      </div>
    </div>
  );
}

interface DeleteDeviceModalProps {
  deviceName: string;
  onConfirm: () => void;
  onClose: () => void;
}

export function DeleteDeviceModal({ deviceName, onConfirm, onClose }: DeleteDeviceModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 animate-in">
      <div className="bg-white rounded-2xl w-full max-w-sm mx-4 p-5 shadow-xl">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center"><Trash2 size={20} className="text-red-500" /></div>
          <div>
            <h3 className="font-semibold text-sm">Xóa thiết bị</h3>
            <p className="text-xs text-gray-500 mt-0.5">Thao tác này không thể hoàn tác.</p>
          </div>
        </div>
        <p className="text-xs text-gray-600 mb-4">
          Bạn có chắc muốn xóa thiết bị <strong>{deviceName}</strong>?
        </p>
        <div className="flex items-center gap-2 justify-end">
          <button onClick={onClose} className="h-8 px-4 rounded-xl text-xs text-gray-600 hover:bg-gray-100">Hủy</button>
          <button onClick={onConfirm} className="h-8 px-4 rounded-xl bg-red-500 text-white text-xs font-medium">Xóa</button>
        </div>
      </div>
    </div>
  );
}
