"use client";

import React, { useState, useRef } from "react";
import { Trash2 } from "lucide-react";

import { materialSchema } from "./materialValidations";

const initialMaterialForm = {
	name: "",
	unit: null,
	quantity: null,
	description: ""
};

const inputClass =
	"w-full h-10 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 px-3 shadow-sm bg-white outline-none transition-all";

const newRowInputClass =
	"w-full h-10 px-3 rounded-lg border border-slate-300 text-sm focus:ring-2 focus:ring-green-500/20 focus:border-green-500 outline-none";

/**
 * Reusable Returnable / Non-Returnable materials table.
 *
 * The parent owns the source-of-truth list (`materials` / `setMaterials`);
 * this component only owns the ephemeral "adding a new row" / "editing a
 * row" UI state, so two independent instances (Returnable, Non-Returnable)
 * never interfere with each other.
 */
export default function MaterialTable({
	title,
	materials,
	setMaterials,
	units,
	getLabelById
}) {
	const tableRef = useRef(null);

	const [editingIndex, setEditingIndex] = useState(null);
	const [editingMaterial, setEditingMaterial] = useState(null);
	const [newMaterial, setNewMaterial] = useState(null);

	const isNewMaterialValid = materialSchema.safeParse(newMaterial).success;
	const isEditingMaterialValid =
		materialSchema.safeParse(editingMaterial).success;

	const closeRows = () => {
		setEditingIndex(null);
		setEditingMaterial(null);
		setNewMaterial(null);
	};

	const openNewRow = () => {
		setEditingIndex(null);
		setEditingMaterial(null);
		setNewMaterial(initialMaterialForm);

		requestAnimationFrame(() => {
			tableRef.current?.scrollTo({
				top: tableRef.current.scrollHeight,
				behavior: "smooth",
			});
		});
	};

	const openEditRow = (index) => {
		setNewMaterial(null);
		setEditingIndex(index);
		setEditingMaterial({ ...materials[index] });
	};

	const addMaterial = () => {
		if (!newMaterial) return;
		setMaterials((prev) => [...prev, newMaterial]);
		closeRows();
	};

	const saveEdit = () => {
		if (editingIndex === null) return;
		setMaterials((prev) => {
			const updated = [...prev];
			updated[editingIndex] = { ...editingMaterial };
			return updated;
		});
		closeRows();
	};

	const deleteRow = (index) => {
		closeRows();
		setMaterials((prev) => {
			const updated = [...prev];
			updated.splice(index, 1);
			return updated;
		});
	};

	return (
		<section className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden mb-8">
			<div className="px-6 py-4 flex justify-between items-center bg-slate-50 border-b border-slate-100">
				<h3 className="text-sm font-black text-[#0a1e4d] uppercase tracking-wide flex items-center gap-2">
					{title}:
				</h3>
				<span className="px-4 py-1.5 bg-white border border-slate-200 rounded-lg text-sm text-[#0a1e4d] font-black shadow-sm">
					Total: {materials.length}
				</span>
			</div>
			<div
				ref={tableRef} 
				className="overflow-x-auto max-h-[420px] overflow-y-auto"
			>
				<table className="w-full min-w-[720px] table-fixed text-left">
					<thead className="bg-[#0a1e4d] text-white">
						<tr>
							<th className="w-16 px-4 py-3 text-xs font-semibold border-r border-white/10 uppercase tracking-wider">
								SNo.
							</th>
							<th className="w-[25%] px-4 py-3 text-xs font-semibold border-r border-white/10 uppercase tracking-wider">
								Item Name
							</th>
							<th className="w-24 px-4 py-3 text-xs font-semibold border-r border-white/10 uppercase tracking-wider">
								Quantity
							</th>
							<th className="w-32 px-4 py-3 text-xs font-semibold border-r border-white/10 uppercase tracking-wider">
								Unit
							</th>
							<th className="w-[35%] px-4 py-3 text-xs font-semibold border-r border-white/10 uppercase tracking-wider">
								Description
							</th>
							<th className="w-28 px-4 py-3 text-xs font-semibold text-center">
								Action
							</th>
						</tr>
					</thead>
					<tbody className="divide-y divide-slate-100">
						{materials.length === 0 && !newMaterial && (
							<tr>
								<td
									colSpan="6"
									className="p-10 text-center text-sm text-slate-400 italic bg-white"
								>
									No Materials added yet. Click "Add Material" below.
								</td>
							</tr>
						)}

						{materials.map((m, i) =>
							editingIndex !== i ? (
								<tr
									key={i}
									onClick={() => openEditRow(i)}
									className="hover:bg-orange-50/50 transition-colors cursor-pointer"
								>
									<td className="px-4 py-4 text-sm text-slate-500 font-medium border-r border-slate-100">
										{(i + 1).toString().padStart(2, "0")}
									</td>
									<td className="px-4 py-4 border-r border-slate-100">
										<p className="text-sm font-semibold text-slate-800">
											{m.name}
										</p>
									</td>
									<td className="px-4 py-4 border-r border-slate-100">
										<p className="text-sm font-semibold text-slate-800">
											{m.quantity}
										</p>
									</td>
									<td className="px-4 py-4 border-r border-slate-100">
										<p className="text-sm font-semibold text-slate-800">
											{getLabelById(units, m.unit)}
										</p>
									</td>
									<td className="px-4 py-4 border-r border-slate-100">
										<p className="text-sm font-semibold text-slate-800">
											{m.description}
										</p>
									</td>
									<td className="px-4 py-4 text-center">
										<button
											onClick={(e) => {
												e.stopPropagation();
												deleteRow(i);
											}}
											className="text-red-600 hover:text-red-800 hover:bg-red-100 p-2 rounded-lg transition-colors"
										>
											<Trash2 size={18} />
										</button>
									</td>
								</tr>
							) : (
								<tr key={i} className="bg-orange-50/60 shadow-sm">
									<td className="px-4 py-4 text-sm text-slate-500 font-medium border-r border-slate-100">
										{(i + 1).toString().padStart(2, "0")}
									</td>
									<td className="px-4 py-4 border-r border-slate-100">
										<input
											value={editingMaterial?.name || ""}
											onChange={(e) =>
												setEditingMaterial((prev) => ({
													...prev,
													name: e.target.value
												}))
											}
											className={inputClass}
										/>
									</td>
									<td className="px-4 py-4 border-r border-slate-100">
										<input
											type="number"
											min="1"
											value={editingMaterial?.quantity || ""}
											onChange={(e) =>
												setEditingMaterial({
													...editingMaterial,
													quantity: e.target.value
														? Number(e.target.value)
														: null
												})
											}
											className={inputClass}
										/>
									</td>
									<td className="px-4 py-4 border-r border-slate-100">
										<select
											value={editingMaterial?.unit || ""}
											onChange={(e) =>
												setEditingMaterial({
													...editingMaterial,
													unit: e.target.value ? Number(e.target.value) : null
												})
											}
											className={inputClass}
										>
											<option value="">Select Unit</option>
											{units.map((u) => (
												<option key={u.id} value={u.id}>
													{u.name}
												</option>
											))}
										</select>
									</td>
									<td className="px-4 py-4 border-r border-slate-100">
										<input
											value={editingMaterial?.description || ""}
											onChange={(e) =>
												setEditingMaterial({
													...editingMaterial,
													description: e.target.value
												})
											}
											className={inputClass}
										/>
									</td>
									<td className="px-4 py-4 text-center">
										<button
											disabled={!isEditingMaterialValid}
											onClick={saveEdit}
											className={`p-2 rounded-lg transition-colors ${
												isEditingMaterialValid
													? "text-green-600 hover:text-green-800 hover:bg-green-100"
													: "text-slate-400 bg-slate-100 cursor-not-allowed"
											}`}
										>
											Save
										</button>
										<button
											onClick={closeRows}
											className="text-red-600 hover:text-red-800 hover:bg-red-100 p-2 rounded-lg transition-colors"
										>
											Cancel
										</button>
									</td>
								</tr>
							)
						)}

						{newMaterial && (
							<tr className="bg-green-50/60 shadow-sm">
								<td className="px-4 py-4 text-sm text-slate-500 font-medium border-r border-slate-100">
									{(materials.length + 1).toString().padStart(2, "0")}
								</td>
								<td className="px-4 py-4 border-r border-slate-100">
									<input
										value={newMaterial.name}
										onChange={(e) =>
											setNewMaterial({ ...newMaterial, name: e.target.value })
										}
										className={newRowInputClass}
									/>
								</td>
								<td className="px-4 py-4 border-r border-slate-100">
									<input
										type="number"
										min="1"
										value={newMaterial.quantity ?? ""}
										onChange={(e) =>
											setNewMaterial({
												...newMaterial,
												quantity: e.target.value ? Number(e.target.value) : null
											})
										}
										className={newRowInputClass}
									/>
								</td>
								<td className="px-4 py-4 border-r border-slate-100">
									<select
										value={newMaterial.unit ?? ""}
										onChange={(e) =>
											setNewMaterial({
												...newMaterial,
												unit: e.target.value ? Number(e.target.value) : null
											})
										}
										className={newRowInputClass}
									>
										<option value="">Select Unit</option>
										{units.map((u) => (
											<option key={u.id} value={u.id}>
												{u.name}
											</option>
										))}
									</select>
								</td>
								<td className="px-4 py-4 border-r border-slate-100">
									<input
										value={newMaterial.description}
										onChange={(e) =>
											setNewMaterial({
												...newMaterial,
												description: e.target.value
											})
										}
										className={newRowInputClass}
									/>
								</td>
								<td className="px-4 py-4 text-center">
									<button
										disabled={!isNewMaterialValid}
										onClick={addMaterial}
										className={`p-2 rounded-lg transition-colors ${
											isNewMaterialValid
												? "text-green-600 hover:text-green-800 hover:bg-green-100"
												: "text-slate-400 bg-slate-100 cursor-not-allowed"
										}`}
									>
										Add
									</button>
									<button
										onClick={closeRows}
										className="text-red-600 hover:text-red-800 hover:bg-red-100 p-2 rounded-lg transition-colors"
									>
										Cancel
									</button>
								</td>
							</tr>
						)}
					</tbody>
				</table>
			</div>
			<div className="p-4 bg-white border-t border-slate-200 flex justify-end">
				<button
					onClick={openNewRow}
					className="bg-orange-600 text-white text-xs font-bold px-6 py-3 rounded-xl shadow-lg hover:bg-orange-700 transition-all uppercase tracking-wider"
				>
					Add Material
				</button>
			</div>
		</section>
	);
}