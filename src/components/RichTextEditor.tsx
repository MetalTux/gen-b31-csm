// src/components/RichTextEditor.tsx
"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import TextAlign from "@tiptap/extension-text-align";
import Color from "@tiptap/extension-color";
import { TextStyle } from "@tiptap/extension-text-style";
import Placeholder from "@tiptap/extension-placeholder";
import Link from "@tiptap/extension-link";
// 1. Nuevas importaciones para las imágenes
import ImageResize from "tiptap-extension-resize-image";
import imageCompression from "browser-image-compression";

import { useRef, useState } from "react";
import { uploadFiles } from "@/lib/uploadthing";
import { 
  Bold, Italic, Underline as UnderlineIcon, 
  AlignLeft, AlignCenter, AlignRight, 
  List, ListOrdered, Link2, Image as Image2, 
  Heading1, Heading2, RotateCcw 
} from "lucide-react";

interface RichTextEditorProps {
  content: string;
  onChange: (html: string) => void;
  placeholder?: string;
}

export default function RichTextEditor({ content, onChange, placeholder = "Escribe aquí con formato..." }: RichTextEditorProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);

  const editor = useEditor({
    extensions: [
      StarterKit,
      Underline,
      TextStyle,
      Color,
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      Placeholder.configure({ placeholder }),
      Link.configure({ 
        openOnClick: false, 
        HTMLAttributes: { class: "text-brand-accent underline font-semibold hover:text-brand-navy transition-colors" } 
      }),
      ImageResize.configure({ 
        allowBase64: true, 
        HTMLAttributes: { class: "rounded-xl border border-gray-200 shadow-sm max-w-full my-4" } 
      }),
    ],
    content: content,
    editorProps: {
      attributes: {
        class: "focus:outline-none text-gray-800 min-h-[220px]",
      },
    },
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
    immediatelyRender: false,
  });

  if (!editor) return null;

  const addLink = () => {
    const url = window.prompt("Ingresa la URL del enlace:");
    if (url) {
      editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
    }
  };

  const handleImageClick = () => fileInputRef.current?.click();

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    
    try {
      // 3. LA MAGIA DE LA COMPRESIÓN
      const options = {
        maxSizeMB: 0.8,         // La imagen jamás pesará más de 800KB
        maxWidthOrHeight: 1200, // Ninguna foto será más ancha de 1200 píxeles
        useWebWorker: true,
      };
      
      // Esperamos a que la librería comprima la foto de tu celular
      const compressedBlob = await imageCompression(file, options);
      
      // Convertimos el resultado en un Archivo válido para UploadThing
      const compressedFile = new File([compressedBlob], file.name, {
        type: compressedBlob.type,
      });

      // 4. Subimos la foto ya aligerada a la nube
      const res = await uploadFiles("adminImageUploader", {
        files: [compressedFile],
      });

      if (res && res.length > 0) {
        const uploadedUrl = res[0].url;
        // La insertamos en el editor (y gracias a ImageResize, podrás achicarla arrastrando)
        editor.chain().focus().setImage({ src: uploadedUrl }).run();
      }
    } catch (error) {
      console.error("Error al subir la imagen:", error);
      alert("Hubo un problema al comprimir o subir la imagen.");
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  return (
    <div className="w-full border border-gray-300 rounded-xl overflow-hidden focus-within:ring-2 focus-within:ring-brand-accent focus-within:border-transparent transition-all bg-white">
      {/* BARRA DE HERRAMIENTAS (Sin Cambios) */}
      <div className="flex flex-wrap items-center gap-1 p-2 bg-gray-50 border-b border-gray-200">
        <button type="button" onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} className={`p-1.5 rounded hover:bg-gray-200 transition-colors ${editor.isActive("heading", { level: 1 }) ? "bg-brand-navy text-white hover:bg-brand-navy" : "text-gray-600"}`}><Heading1 size={18} /></button>
        <button type="button" onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} className={`p-1.5 rounded hover:bg-gray-200 transition-colors ${editor.isActive("heading", { level: 2 }) ? "bg-brand-navy text-white hover:bg-brand-navy" : "text-gray-600"}`}><Heading2 size={18} /></button>
        <div className="w-[1px] h-6 bg-gray-300 mx-1" />
        <button type="button" onClick={() => editor.chain().focus().toggleBold().run()} className={`p-1.5 rounded hover:bg-gray-200 transition-colors ${editor.isActive("bold") ? "bg-brand-navy text-white hover:bg-brand-navy" : "text-gray-600"}`}><Bold size={18} /></button>
        <button type="button" onClick={() => editor.chain().focus().toggleItalic().run()} className={`p-1.5 rounded hover:bg-gray-200 transition-colors ${editor.isActive("italic") ? "bg-brand-navy text-white hover:bg-brand-navy" : "text-gray-600"}`}><Italic size={18} /></button>
        <button type="button" onClick={() => editor.chain().focus().toggleUnderline().run()} className={`p-1.5 rounded hover:bg-gray-200 transition-colors ${editor.isActive("underline") ? "bg-brand-navy text-white hover:bg-brand-navy" : "text-gray-600"}`}><UnderlineIcon size={18} /></button>
        <div className="w-[1px] h-6 bg-gray-300 mx-1" />
        <button type="button" onClick={() => editor.chain().focus().setTextAlign("left").run()} className={`p-1.5 rounded hover:bg-gray-200 transition-colors ${editor.isActive({ textAlign: "left" }) ? "bg-brand-navy text-white hover:bg-brand-navy" : "text-gray-600"}`}><AlignLeft size={18} /></button>
        <button type="button" onClick={() => editor.chain().focus().setTextAlign("center").run()} className={`p-1.5 rounded hover:bg-gray-200 transition-colors ${editor.isActive({ textAlign: "center" }) ? "bg-brand-navy text-white hover:bg-brand-navy" : "text-gray-600"}`}><AlignCenter size={18} /></button>
        <button type="button" onClick={() => editor.chain().focus().setTextAlign("right").run()} className={`p-1.5 rounded hover:bg-gray-200 transition-colors ${editor.isActive({ textAlign: "right" }) ? "bg-brand-navy text-white hover:bg-brand-navy" : "text-gray-600"}`}><AlignRight size={18} /></button>
        <div className="w-[1px] h-6 bg-gray-300 mx-1" />
        <button type="button" onClick={() => editor.chain().focus().toggleBulletList().run()} className={`p-1.5 rounded hover:bg-gray-200 transition-colors ${editor.isActive("bulletList") ? "bg-brand-navy text-white hover:bg-brand-navy" : "text-gray-600"}`}><List size={18} /></button>
        <button type="button" onClick={() => editor.chain().focus().toggleOrderedList().run()} className={`p-1.5 rounded hover:bg-gray-200 transition-colors ${editor.isActive("orderedList") ? "bg-brand-navy text-white hover:bg-brand-navy" : "text-gray-600"}`}><ListOrdered size={18} /></button>
        <div className="w-[1px] h-6 bg-gray-300 mx-1" />
        <button type="button" onClick={addLink} className={`p-1.5 rounded hover:bg-gray-200 transition-colors ${editor.isActive("link") ? "bg-brand-navy text-white hover:bg-brand-navy" : "text-gray-600"}`}><Link2 size={18} /></button>
        <button type="button" onClick={handleImageClick} disabled={isUploading} className="p-1.5 rounded hover:bg-gray-200 text-gray-600 transition-colors disabled:opacity-50"><Image2 size={18} /></button>
        <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/*" className="hidden" />
        <div className="w-[1px] h-6 bg-gray-300 mx-1" />
        <div className="flex items-center gap-1">
          <label htmlFor="colorPicker" className="w-7 h-7 flex items-center justify-center rounded hover:bg-gray-200 cursor-pointer transition-colors">
            <input id="colorPicker" type="color" onInput={(e) => editor.chain().focus().setColor(e.currentTarget.value).run()} value={editor.getAttributes('textStyle').color || '#1f2937'} className="w-5 h-5 border-0 bg-transparent cursor-pointer p-0 rounded-sm" />
          </label>
          <button type="button" onClick={() => editor.chain().focus().unsetColor().run()} className="p-1.5 text-gray-400 hover:text-gray-700 rounded transition-colors"><RotateCcw size={16} /></button>
        </div>
      </div>

      {/* ÁREA DE ESCRITURA */}
      <div className="p-4 max-h-[450px] overflow-y-auto tiptap-container">
        <EditorContent editor={editor} />
      </div>
    </div>
  );
}