"use client";

import { useState } from "react";

interface UploadFormProps {
  onGenerate: (data: { photo: string; name: string; social: string }) => void;
}

export default function UploadForm({ onGenerate }: UploadFormProps) {
  const [photo, setPhoto] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [social, setSocial] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!photo || !name || !social) return alert("Lengkapi semua data!");
    onGenerate({ photo, name, social });
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhoto(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-white/90 p-6 rounded-2xl shadow-lg w-80 flex flex-col gap-4 text-center"
    >
      <h2 className="text-xl font-bold text-gray-800 mb-2">Generate ID Card</h2>

      <input
        type="file"
        accept="image/*"
        onChange={handlePhotoUpload}
        className="block w-full text-sm text-gray-700 border border-gray-300 rounded-lg cursor-pointer focus:outline-none"
      />

      {photo && (
        <img
          src={photo}
          alt="Preview"
          className="w-24 h-24 rounded-full object-cover mx-auto"
        />
      )}

      <input
        type="text"
        placeholder="Nama kamu"
        value={name}
        onChange={(e) => setName(e.target.value)}
        className="border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring focus:ring-emerald-400"
      />

      <input
        type="text"
        placeholder="Username Sosmed (tanpa @)"
        value={social}
        onChange={(e) => setSocial(e.target.value)}
        className="border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring focus:ring-emerald-400"
      />

      <button
        type="submit"
        className="bg-emerald-500 hover:bg-emerald-600 text-white font-semibold py-2 px-4 rounded-lg transition-colors"
      >
        Generate
      </button>
    </form>
  );
}
