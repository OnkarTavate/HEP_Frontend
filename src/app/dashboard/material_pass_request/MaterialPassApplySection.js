"use client";

import React, { useState, useEffect } from "react";
import { toast } from "sonner";
import axios from "axios";
import {
	Wallet,
	Info,
	Users,
	Truck,
	Send,
	X,
	Calculator,
	Plus,
	Upload,
	Search,
	FileText,
	ShieldCheck,
	Phone,
	UserPlus,
	BookOpen,
	FileCheck2,
	CheckCircle2,
	Eye,
	AlertCircle,
	CheckCircle,
	RefreshCw,
	Edit3,
	Car,
	User,
	Trash2
} from "lucide-react";

import MaterialTable from "./Materialtable";
import { createMaterialPassSchema } from "./materialValidations";

const AGENT_API = process.env.NEXT_PUBLIC_AGENT_API;
const DEPT_API = process.env.NEXT_PUBLIC_ADMIN_API;

const getTodayString = () => {
  const today = new Date();

  const yyyy = today.getFullYear();
  const mm = String(today.getMonth() + 1).padStart(2, "0");
  const dd = String(today.getDate()).padStart(2, "0");

  return `${yyyy}-${mm}-${dd}`;
};


export default function MaterialPassApplySection({getLabelById}) {
    const [agreedToTerms, setAgreedToTerms] = useState(false);
		const [loading, setLoading] = useState(false);
		const [profileLoading, setProfileLoading] = useState(true);

		const [returnables, setReturnables] = useState([]);
		const [nonReturnables, setNonReturnables] = useState([]);

		const [generalForm, setGeneralForm] = useState({
			companyName: "",
			email: "",
			mobile: "",
			balance: "7725.00", // Keep mock for now if wallet isn't built
			utilizedBalance: "0.00",
			purpose: null,
			purposeOther: "",
			concernedDepartment: null,
			location: null,
			locationOther: "",
			entryDate: null
		});

		const [masterData, setMasterData] = useState({
			passTypes: [],
			purposes: [],
			departments: [],
			locations: [],
			units: []
		});

		const fetchProfile = async () => {
			try {
				setProfileLoading(true);
				const token = localStorage.getItem("accessToken");
				const config = { headers: { Authorization: `Bearer ${token}` } };

				const res = await axios.get(`${AGENT_API}/agents/profile`, config);
				const profile = res?.data?.data || res?.data || {};

				setGeneralForm((prev) => ({
					...prev,
					companyName: profile.entityName ?? prev.companyName,
					email: profile.email ?? prev.email,
					mobile: profile.mobileNo ?? prev.mobile
				}));
			} catch (error) {
				console.error("Error loading profile data", error);
				toast.error("Failed to load company profile details.");
			} finally {
				setProfileLoading(false);
			}
		};

		const fetchMasterData = async () => {
			try {
				const token = localStorage.getItem("accessToken");
				const config = { headers: { Authorization: `Bearer ${token}` } };

				const [
					purposeRes,
					deprtmentRes,
					locationRes,
					passTypeRes,
					unitRes
				] = await Promise.all([
						axios
							.get(`${AGENT_API}/pass-request/get-visit-purposes`, config)
							.catch(() => ({ data: [] })),
						axios
							.get(`${DEPT_API}/user/departments`, config)
							.catch(() => ({ data: [] })),
						axios
							.get(`${AGENT_API}/material-pass/locations`, config)
							.catch(() => ({ data: [] })),
						axios
							.get(`${AGENT_API}/material-pass/RegularPassTypes`, config)
							.catch(() => ({ data: [] })),
						axios
							.get(`${AGENT_API}/material-pass/units`, config)
							.catch(() => ({ data: [] }))
					]);

				const extractArray = (res) =>
					Array.isArray(res?.data?.data)
						? res.data.data
						: Array.isArray(res?.data)
							? res.data
							: [];

				setMasterData((prev) => ({
					...prev,
					purposes: extractArray(purposeRes),
					departments: extractArray(deprtmentRes),
					locations: extractArray(locationRes),
					passTypes: extractArray(passTypeRes),
					units: extractArray(unitRes),
				}));
			} catch (error) {
				console.error("Error loading API master data", error);
			}
		};

		useEffect(() => {
			fetchProfile();
			fetchMasterData();
		}, []);

		const othersPurposeId = masterData.purposes.find(
			p => p.name.trim().toLowerCase() === "others"
		)?.id;

		const othersLocationId = masterData.locations.find(
			l => l.name.trim().toLowerCase() === "others"
		)?.id;

		const handleSubmitRequest = async () => {

			if (!agreedToTerms)
				return toast.warning("Please agree to the Terms and Conditions.");

			const schema = createMaterialPassSchema(
				othersPurposeId,
				othersLocationId
			);

			const result = schema.safeParse({
				...generalForm,
				returnables,
				nonReturnables
			});

			if (!result.success) {
				console.log(result.error.flatten());

				toast.warning(result.error.issues[0].message);

				console.log(result.error.issues);

				return;
			}
			
			const payload = result.data
			console.log(payload);

			try {
				setLoading(true);
				const token = localStorage.getItem("accessToken");
				const config = { 
					headers: { 
						Authorization: `Bearer ${token}`,
						"Content-Type": "application/json",
					 },
				};

				const response = await axios.post(
					`${AGENT_API}/material-pass/createRegularMaterialPassRequest`,
					payload,
					config
				)

				toast.success(response.data.message);

				setGeneralForm((prev) => ({
						...prev,
						purpose: null,
						purposeOther: "",
						concernedDepartment: null,
						location: null,
						locationOther: "",
						entryDate: null
				}));

				setReturnables([]);
				setNonReturnables([]);
				setAgreedToTerms(false);
				
				console.log(response.data);
				
			} catch (error) {

				console.error(error);

				toast.error(
					error?.response?.data?.message ||
					"Failed to submit material pass request."
				);
			} finally {
				setLoading(false);
			}

		}

		const inputClass =
			"w-full h-10 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 px-3 shadow-sm bg-white outline-none transition-all";

    return (
			<div className="space-y-8 animate-in fade-in duration-300">
				<section className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
					<div className="px-6 py-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
						<h3 className="font-black text-[#0a1e4d] flex items-center gap-2 uppercase text-sm tracking-wider">
							<Info className="h-5 w-5 text-orange-500" /> General Details
						</h3>
						<span className="text-xs font-semibold text-amber-700 bg-amber-50 border border-amber-200 px-3 py-2 rounded-lg">
							Important: Please ensure all materials listed below are moved in within
							48 hours of your chosen entry date.
						</span>
					</div>
					<div className="p-6">
						<div className="bg-slate-50 rounded-xl p-5 border border-slate-100 grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
							<div>
								<p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
									Company Name
								</p>
								<p className="text-sm font-bold text-[#0a1e4d] mt-1">
									{profileLoading ? "Loading..." : generalForm.companyName || "—"}
								</p>
							</div>
							<div>
								<p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
									Email ID
								</p>
								<p className="text-sm font-semibold text-slate-700 mt-1">
									{profileLoading ? "Loading..." : generalForm.email || "—"}
								</p>
							</div>
							<div>
								<p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
									Mobile No
								</p>
								<p className="text-sm font-semibold text-slate-700 mt-1">
									{profileLoading
										? "Loading..."
										: generalForm.mobile
											? `+91 ${generalForm.mobile}`
											: "—"}
								</p>
							</div>
							{/* <div>
								<p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
									Utilized Balance
								</p>
								<p className="text-sm font-black text-red-600 mt-1">
									₹ {generalForm.utilizedBalance}
								</p>
							</div> */}
						</div>
						<div className="grid grid-cols-1 md:grid-cols-3 gap-6">
							<div className="space-y-1.5">
								<label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
									Purpose of Visit <span className="text-red-500">*</span>
								</label>
								<select
									value={generalForm.purpose ?? ""}
									onChange={(e) =>
										setGeneralForm({
											...generalForm,
											purpose: e.target.value ? Number(e.target.value) : null,
										})
									}
									className={inputClass}
								>
									<option value="">Select Purpose</option>
									{masterData.purposes.map((p) => (
										<option key={p.id} value={p.id}>
											{p.name}
										</option>
									))}
								</select>
								{generalForm.purpose === othersPurposeId && (
									<input
										type="text"
										onChange={(e) =>
											setGeneralForm({
												...generalForm,
												purposeOther: e.target.value,
											})
										}
										className={`${inputClass} mt-3 animate-in fade-in`}
										placeholder="Specify other purpose..."
									/>
								)}
							</div>
							<div className="space-y-1.5">
								<label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
									Department{" "}
									<span className="text-red-500">*</span>
								</label>
								<select
									value={generalForm.concernedDepartment ?? ""}
									onChange={(e) =>
										setGeneralForm({
											...generalForm,
											concernedDepartment: e.target.value ? Number(e.target.value) : null,
										})
									}
									className={inputClass}
								>
									<option value="">Select Department</option>
									{masterData.departments.map((d) => (
										<option key={d.id} value={d.id}>
											{d.departmentName}
										</option>
									))}
								</select>
							</div>
							<div className="space-y-1.5">
								<label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
									Location <span className="text-red-500">*</span>
								</label>
								<select
									value={generalForm.location ?? ""}
									onChange={(e) =>
										setGeneralForm({
											...generalForm,
											location: e.target.value ? Number(e.target.value) : null,
										})
									}
									className={inputClass}
								>
									<option value="">Select Location</option>
									{masterData.locations.map((l) => (
										<option key={l.id} value={l.id}>
											{l.name}
										</option>
									))}
								</select>
								{generalForm.location === othersLocationId && (
									<input
										type="text"
										onChange={(e) =>
											setGeneralForm({
												...generalForm,
												locationOther: e.target.value,
											})
										}
										className={`${inputClass} mt-3 animate-in fade-in`}
										placeholder="Specify location..."
									/>
								)}
							</div>
							<div className="space-y-1.5">
								<label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
									Entry Date <span className="text-red-500">*</span>
								</label>
								<input
									type="date"
									value={generalForm.entryDate || ""}
									onChange={(e) =>
										setGeneralForm({
											...generalForm,
											entryDate: e.target.value,
										})
									}
									className={inputClass}
									min={getTodayString()}
								/>
							</div>
						</div>
					</div>
				</section>

				<MaterialTable
					title="Returnable Materials"
					materials={returnables}
					setMaterials={setReturnables}
					units={masterData.units}
					getLabelById={getLabelById}
				/>

				<MaterialTable
					title="Non Returnable Materials"
					materials={nonReturnables}
					setMaterials={setNonReturnables}
					units={masterData.units}
					getLabelById={getLabelById}
				/>

				<footer className="flex justify-end pt-2 pb-8">
					<div className="bg-white p-8 w-full max-w-md shadow-2xl rounded-2xl border border-slate-200">
						<div className="bg-orange-50/50 p-5 rounded-xl border border-orange-100 space-y-3">
							<h4 className="text-xs font-black text-[#0a1e4d] uppercase flex items-center gap-2 tracking-wider">
								<ShieldCheck className="h-4 w-4 text-emerald-600" /> Terms &
								Conditions
							</h4>
							<p className="text-[10px] text-slate-600 text-justify leading-relaxed font-medium">
								I/We hereby certify that the above permits are required only
								for our official purpose. We hold responsibility for
								identification and all activities inside the port...
							</p>
							<label className="flex items-center gap-3 cursor-pointer pt-3 group">
								<input
									type="checkbox"
									checked={agreedToTerms}
									onChange={(e) => setAgreedToTerms(e.target.checked)}
									className="w-5 h-5 rounded border-slate-300 text-orange-600 focus:ring-orange-500 cursor-pointer"
								/>
								<span className="text-xs font-black text-[#0a1e4d] group-hover:text-orange-600 transition-colors uppercase tracking-wider">
									I agree to the Terms & Conditions
								</span>
							</label>
						</div>
						<button
							onClick={handleSubmitRequest}
							disabled={loading || !agreedToTerms}
							className="w-full mt-6 h-14 bg-[#0a1e4d] hover:bg-[#1a2f64] disabled:bg-slate-300 disabled:cursor-not-allowed text-white rounded-xl font-black text-lg shadow-xl shadow-[#0a1e4d]/20 flex items-center justify-center gap-3 transition-all uppercase tracking-widest"
						>
							{loading ? "Processing..." : "Submit Request"}{" "}
							{!loading && <Send className="h-5 w-5" />}
						</button>
					</div>
				</footer>
			</div>
		)}