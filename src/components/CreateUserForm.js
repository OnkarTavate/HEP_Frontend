"use client";
import React, { useState, useEffect } from "react";

const CreateUserForm = ({ roles, departments }) => {
  const [formData, setFormData] = useState({
    userName: "",
    email: "",
    phoneNumber: "",
    roleId: "",
    departmentId: "",
    password: "APPROVAL", // Default set to APPROVAL
    confirmPassword: "APPROVAL",
  });
  const [message, setMessage] = useState({ type: "", text: "" });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (formData.password !== formData.confirmPassword) {
      return setMessage({ type: "error", text: "Passwords do not match" });
    }

    try {
      const res = await fetch("/api/user/create-user", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      const data = await res.json();
      if (data.success) {
        setMessage({ type: "success", text: "User created successfully!" });
        setFormData({
          userName: "",
          email: "",
          phoneNumber: "",
          roleId: "",
          departmentId: "",
          password: "APPROVAL",
          confirmPassword: "APPROVAL",
        });
      } else {
        setMessage({ type: "error", text: data.message });
      }
    } catch (err) {
      setMessage({ type: "error", text: "Failed to connect to server" });
    }
  };

  return (
    <div className="max-w-2xl bg-white p-8 rounded-lg shadow-sm border border-gray-200">
      <h2 className="text-2xl font-semibold text-gray-800 mb-6 border-b pb-4">
        Create a new account.
      </h2>

      {message.text && (
        <div
          className={`p-3 mb-4 rounded ${message.type === "success" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}
        >
          {message.text}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            User name
          </label>
          <input
            type="text"
            className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 outline-none"
            value={formData.userName}
            onChange={(e) =>
              setFormData({ ...formData, userName: e.target.value })
            }
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Email Id
          </label>
          <input
            type="email"
            className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 outline-none"
            value={formData.email}
            onChange={(e) =>
              setFormData({ ...formData, email: e.target.value })
            }
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Phone Number
          </label>
          <input
            type="text"
            className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 outline-none"
            value={formData.phoneNumber}
            onChange={(e) =>
              setFormData({ ...formData, phoneNumber: e.target.value })
            }
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Roles
          </label>
          <select
            className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 outline-none"
            value={formData.roleId}
            onChange={(e) =>
              setFormData({ ...formData, roleId: e.target.value })
            }
            required
          >
            <option value="">-- Select --</option>
            {roles.map((role) => (
              <option key={role.id} value={role.id}>
                {role.roleName}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Department
          </label>
          <select
            className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 outline-none"
            value={formData.departmentId}
            onChange={(e) =>
              setFormData({ ...formData, departmentId: e.target.value })
            }
            required
          >
            <option value="">-- Select --</option>
            {departments.map((dept) => (
              <option key={dept.id} value={dept.id}>
                {dept.departmentName}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Password
          </label>
          <input
            type="password"
            className="w-full p-2 border border-gray-300 rounded bg-gray-50"
            value={formData.password}
            readOnly // Keeps it as "APPROVAL" as per your instruction
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Confirm password
          </label>
          <input
            type="password"
            className="w-full p-2 border border-gray-300 rounded bg-gray-50"
            value={formData.confirmPassword}
            readOnly
          />
        </div>

        <button
          type="submit"
          className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700 transition-colors font-medium"
        >
          Register
        </button>
      </form>
    </div>
  );
};

export default CreateUserForm;
