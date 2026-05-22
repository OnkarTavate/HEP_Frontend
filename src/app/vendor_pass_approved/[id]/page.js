"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import axios from "axios";
import { QRCodeSVG } from "qrcode.react";
import {
  CheckCircle,
  User,
  Car,
  Download,
  AlertCircle,
  Loader2,
  ChevronLeft,
  QrCode,
  Calendar,
  Building2,
  FileBadge
} from "lucide-react";

const AGENT_API = process.env.NEXT_PUBLIC_AGENT_API;

export default function VendorPassApprovedPage() {
  const params = useParams();
  const vendorPassId = params.id;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [passData, setPassData] = useState(null);
  const [selectedEntity, setSelectedEntity] = useState(null);
  const [entityType, setEntityType] = useState(null); // 'person' or 'vehicle'
  const [selectedIndex, setSelectedIndex] = useState(null);

  useEffect(() => {
    fetchVendorPassData();
  }, [vendorPassId]);

  const fetchVendorPassData = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await axios.get(
        `${AGENT_API}/pass-request/vendor-qr-data/${vendorPassId}`
      );

      setPassData(response.data);
    } catch (err) {
      console.error("Error fetching vendor pass data:", err);
      setError(
        err.response?.data?.message ||
        "Failed to load pass data. Please check your link or contact support."
      );
    } finally {
      setLoading(false);
    }
  };

  const handleViewQR = (entity, type, index) => {
    setSelectedEntity(entity);
    setEntityType(type);
    setSelectedIndex(index);
  };

  const handleBack = () => {
    setSelectedEntity(null);
    setEntityType(null);
    setSelectedIndex(null);
  };

  const downloadSinglePDF = async () => {
    if (!selectedEntity || selectedIndex === null || !entityType) return;
    try {
      const response = await axios.get(
        `http://localhost:5007/api/qr/vendor-generate-single-qr/${vendorPassId}/${entityType}/${selectedIndex}`,
        { responseType: "blob" }
      );
      const blob = new Blob([response.data], { type: "application/pdf" });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      const passNo = selectedEntity.personPassNo || selectedEntity.vehiclePassNo || "pass";
      link.download = `Pass_${passNo}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Failed to download pass PDF:", error);
      alert("Failed to download pass PDF. Please try again.");
    }
  };

  const downloadSinglePDFByIndex = async (entity, type, index) => {
    try {
      const response = await axios.get(
        `http://localhost:5007/api/qr/vendor-generate-single-qr/${vendorPassId}/${type}/${index}`,
        { responseType: "blob" }
      );
      const blob = new Blob([response.data], { type: "application/pdf" });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      const passNo = entity.personPassNo || entity.vehiclePassNo || "pass";
      link.download = `Pass_${passNo}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Failed to download pass PDF:", error);
      alert("Failed to download pass PDF. Please try again.");
    }
  };

  const downloadPDF = async () => {
    try {
      const response = await axios.get(
        `http://localhost:5007/api/qr/vendor-generate-qr/${vendorPassId}`,
        { responseType: "blob" }
      );
      const blob = new Blob([response.data], { type: "application/pdf" });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `VendorPass-${vendorPassId}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Failed to download PDF:", error);
      alert("Failed to download PDF. Please try again.");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-orange-500 mx-auto mb-4" />
          <p className="text-slate-600">Loading your approved pass...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl shadow-lg p-8 max-w-md w-full text-center">
          <AlertCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-slate-800 mb-2">Error Loading Pass</h2>
          <p className="text-slate-600 mb-6">{error}</p>
          <button
            onClick={fetchVendorPassData}
            className="bg-orange-500 hover:bg-orange-600 text-white px-6 py-2 rounded-lg font-medium transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  if (!passData) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl shadow-lg p-8 max-w-md w-full text-center">
          <AlertCircle className="h-16 w-16 text-amber-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-slate-800 mb-2">No Data Found</h2>
          <p className="text-slate-600">Unable to retrieve pass information.</p>
        </div>
      </div>
    );
  }

  const { persons, vehicles, referenceNo } = passData;

  // QR Detail View
  if (selectedEntity) {
    const isPerson = entityType === "person";
    const passNo = isPerson
      ? selectedEntity.personPassNo
      : selectedEntity.vehiclePassNo;
    const qrData = passNo || String(selectedEntity.id);

    return (
      <div className="min-h-screen bg-slate-50 py-8 px-4">
        <div className="max-w-md mx-auto">
          <button
            onClick={handleBack}
            className="flex items-center gap-2 text-slate-600 hover:text-slate-800 mb-4 transition-colors"
          >
            <ChevronLeft className="h-5 w-5" />
            Back to Pass List
          </button>

          <div className="bg-white rounded-xl shadow-lg overflow-hidden">
            {/* Header */}
            <div className="bg-gradient-to-r from-orange-500 to-amber-500 p-6 text-white">
              <div className="flex items-center gap-3 mb-2">
                <QrCode className="h-6 w-6" />
                <h1 className="text-xl font-bold">Pass QR Code</h1>
              </div>
              <p className="text-white/90 text-sm">{referenceNo}</p>
            </div>

            {/* QR Code */}
            <div className="p-8 text-center">
              <div className="bg-white p-4 rounded-xl shadow-inner inline-block mb-6">
                <QRCodeSVG
                  id="qr-code-svg"
                  value={qrData}
                  size={250}
                  level="H"
                  includeMargin={true}
                  className="mx-auto"
                />
              </div>

              <div className="space-y-3 mb-6">
                <div className="flex items-center justify-center gap-2">
                  {isPerson ? (
                    <User className="h-5 w-5 text-slate-400" />
                  ) : (
                    <Car className="h-5 w-5 text-slate-400" />
                  )}
                  <span className="font-semibold text-slate-800">
                    {isPerson ? selectedEntity.name : selectedEntity.registrationNo}
                  </span>
                </div>

                <div className="bg-slate-50 rounded-lg p-4 text-left space-y-2">
                  <div className="flex justify-between">
                    <span className="text-slate-500 text-sm">Pass Number:</span>
                    <span className="font-mono font-semibold text-slate-800">{passNo}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500 text-sm">Company:</span>
                    <span className="text-slate-800">{selectedEntity.company}</span>
                  </div>
                  {isPerson && (
                    <>
                      <div className="flex justify-between">
                        <span className="text-slate-500 text-sm">Mobile:</span>
                        <span className="text-slate-800">{selectedEntity.mobile || "N/A"}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500 text-sm">Aadhar:</span>
                        <span className="text-slate-800">{selectedEntity.aadharNo || "N/A"}</span>
                      </div>
                    </>
                  )}
                  {selectedEntity.validFrom && (
                    <div className="flex justify-between">
                      <span className="text-slate-500 text-sm">Valid From:</span>
                      <span className="text-slate-800">{selectedEntity.validFrom}</span>
                    </div>
                  )}
                  {selectedEntity.validTo && (
                    <div className="flex justify-between">
                      <span className="text-slate-500 text-sm">Valid To:</span>
                      <span className="text-slate-800">{selectedEntity.validTo}</span>
                    </div>
                  )}
                </div>
              </div>

              <button
                onClick={downloadSinglePDF}
                className="w-full flex items-center justify-center gap-2 bg-orange-500 hover:bg-orange-600 text-white py-3 rounded-lg font-semibold transition-colors"
              >
                <Download className="h-5 w-5" />
                Download Pass PDF
              </button>
            </div>
          </div>

          <p className="text-center text-slate-500 text-sm mt-6">
            Show this QR code at the gate for entry/exit scanning.
          </p>
        </div>
      </div>
    );
  }

  // List View
  return (
    <div className="min-h-screen bg-slate-50 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-4">
              <div className="bg-green-100 p-3 rounded-full">
                <CheckCircle className="h-8 w-8 text-green-600" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-slate-800">Your Pass is Approved!</h1>
                <p className="text-slate-600">
                  Reference: <span className="font-mono font-semibold">{referenceNo}</span>
                </p>
              </div>
            </div>
            <button
              onClick={downloadPDF}
              className="flex items-center gap-2 bg-orange-600 hover:bg-orange-700 text-white px-5 py-2.5 rounded-lg font-medium transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 3H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Download All Passes PDF
            </button>
          </div>
        </div>

        {/* Persons Section */}
        {persons && persons.length > 0 && (
          <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
            <h2 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
              <User className="h-5 w-5 text-orange-500" />
              Approved Persons ({persons.length})
            </h2>

            <div className="grid gap-4 md:grid-cols-2">
              {persons.map((person, index) => (
                <div
                  key={index}
                  className="border border-slate-200 rounded-lg p-4 hover:border-orange-300 transition-colors"
                >
                  <div className="flex items-start gap-4">
                    <div className="bg-orange-50 p-2 rounded-lg">
                      <User className="h-6 w-6 text-orange-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-slate-800 truncate">
                        {person.name}
                      </h3>
                      <p className="text-sm text-slate-500">
                        Pass: {person.personPassNo}
                      </p>
                      <p className="text-sm text-slate-500">
                        Mobile: {person.mobile || "N/A"}
                      </p>
                      {person.validTo && (
                        <p className="text-sm text-slate-500 flex items-center gap-1 mt-1">
                          <Calendar className="h-3 w-3" />
                          Valid until: {person.validTo}
                        </p>
                      )}
                    </div>
                  </div>

                  <button
                    onClick={() => handleViewQR(person, "person", index)}
                    className="w-full mt-4 flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-900 text-white py-2 rounded-lg text-sm font-medium transition-colors"
                  >
                    <QrCode className="h-4 w-4" />
                    View QR Code
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Vehicles Section */}
        {vehicles && vehicles.length > 0 && (
          <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
            <h2 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
              <Car className="h-5 w-5 text-orange-500" />
              Approved Vehicles ({vehicles.length})
            </h2>

            <div className="grid gap-4 md:grid-cols-2">
              {vehicles.map((vehicle, index) => (
                <div
                  key={index}
                  className="border border-slate-200 rounded-lg p-4 hover:border-orange-300 transition-colors"
                >
                  <div className="flex items-start gap-4">
                    <div className="bg-blue-50 p-2 rounded-lg">
                      <Car className="h-6 w-6 text-blue-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-slate-800 truncate">
                        {vehicle.registrationNo}
                      </h3>
                      <p className="text-sm text-slate-500">
                        Pass: {vehicle.vehiclePassNo}
                      </p>
                      <p className="text-sm text-slate-500">
                        Type: {vehicle.vehicleType || "N/A"}
                      </p>
                      {vehicle.validTo && (
                        <p className="text-sm text-slate-500 flex items-center gap-1 mt-1">
                          <Calendar className="h-3 w-3" />
                          Valid until: {vehicle.validTo}
                        </p>
                      )}
                    </div>
                  </div>

                  <button
                    onClick={() => handleViewQR(vehicle, "vehicle", index)}
                    className="w-full mt-4 flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-900 text-white py-2 rounded-lg text-sm font-medium transition-colors"
                  >
                    <QrCode className="h-4 w-4" />
                    View QR Code
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Instructions */}
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-6">
          <h3 className="font-semibold text-amber-800 mb-2 flex items-center gap-2">
            <FileBadge className="h-5 w-5" />
            Important Instructions
          </h3>
          <ul className="text-amber-700 text-sm space-y-1 list-disc list-inside">
            <li>Click "View QR Code" to see your individual pass QR</li>
            <li>Download and save the QR code for offline use</li>
            <li>Show the QR code at the gate for scanning</li>
            <li>Each QR code is unique and linked to your approved pass</li>
            <li>QR codes are only valid for the approved date range</li>
          </ul>
        </div>

        {/* Footer */}
        <div className="text-center text-slate-400 text-sm mt-8">
          <p className="flex items-center justify-center gap-2">
            <Building2 className="h-4 w-4" />
            Chennai Port Authority
          </p>
          <p className="mt-1">Traffic Department</p>
        </div>
      </div>
    </div>
  );
}
