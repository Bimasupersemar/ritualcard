"use client";

import Image from "next/image";
import { useEffect, useState } from "react";

interface IDCardProps {
  data: {
    photo: string;
    name: string;
    social: string;
  };
  onBack: () => void;
}

export default function IDCard({ data, onBack }: IDCardProps) {
  const [flipped, setFlipped] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setFlipped(true), 1200);
    return () => clearTimeout(t);
  }, []);

  return (
    <div className="idcard-root">
      <div className={`idcard-sheet ${flipped ? "is-flipped" : ""}`}>
        {/* FRONT */}
        <div className="idcard-face idcard-front">
          <Image src="/assets/depan.jpg" alt="Depan" fill className="bg-img" />

          {/* overlay konten — menggunakan absolute positioning */}
          <div className="idcard-overlay">
            <div className="avatar-wrap">
              {/* gunakan data.photo yang sudah berupa dataURL atau path */}
              <Image
                src={data.photo}
                alt="avatar"
                fill
                className="avatar-img"
                sizes="(max-width: 480px) 140px, 220px"
              />
            </div>

            <div className="text-wrap">
              <div className="name">{data.name}</div>
              <div className="social">@{data.social}</div>
            </div>
          </div>
        </div>

        {/* BACK */}
        <div className="idcard-face idcard-back">
          <Image src="/assets/belakang.jpg" alt="Belakang" fill className="bg-img" />
        </div>
      </div>

      <button
        className="btn-back"
        onClick={() => {
          setFlipped(false);
          setTimeout(onBack, 250); // berikan sedikit delay supaya animasi tidak abrupt
        }}
      >
        ← Buat Ulang
      </button>
    </div>
  );
}
