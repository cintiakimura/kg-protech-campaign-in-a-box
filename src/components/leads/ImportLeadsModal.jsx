import React, { useState } from 'react';
import { X, Upload, FileSpreadsheet } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { base44 } from '@/api/base44Client';

export default function ImportLeadsModal({ isOpen, onClose, onSuccess }) {
  const [file, setFile] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);

  if (!isOpen) return null;

  const handleFileChange = (e) => {
    setFile(e.target.files[0]);
  };

  const handleImport = async () => {
    if (!file) {
      alert('Please select a file');
      return;
    }

    setIsProcessing(true);
    try {
      // Upload file
      const { file_url } = await base44.integrations.Core.UploadFile({ file });

      // Extract data using AI
      const result = await base44.integrations.Core.ExtractDataFromUploadedFile({
        file_url: file_url,
        json_schema: {
          type: "array",
          items: {
            type: "object",
            properties: {
              full_name: { type: "string" },
              email: { type: "string" },
              company: { type: "string" },
              language_preference: { type: "string" },
              notes: { type: "string" }
            },
            required: ["full_name", "email"]
          }
        }
      });

      if (result.status === 'success' && result.output) {
        const leadsData = Array.isArray(result.output) ? result.output : [result.output];
        
        if (leadsData.length === 0) {
          alert('No lead data found in the file');
          return;
        }

        // Bulk create leads
        const createdLeads = await Promise.all(
          leadsData.map(lead => 
            base44.entities.Lead.create({
              full_name: lead.full_name,
              email: lead.email,
              company: lead.company || '',
              language_preference: lead.language_preference || 'English',
              notes: lead.notes || '',
              status: 'new'
            })
          )
        );
        
        alert(`Successfully imported ${createdLeads.length} leads!`);
        onSuccess();
        onClose();
      } else {
        alert(`Failed to extract data: ${result.details || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Import error:', error);
      alert(`Import failed: ${error.message || 'Please try again'}`);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-50 p-4">
      <div className="bg-[#2a2a2a] rounded-xl max-w-lg w-full">
        <div className="border-b border-[#333333] p-6 flex items-center justify-between">
          <h2 className="text-xl font-bold text-white">Import Leads</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          <div className="border-2 border-dashed border-[#444444] rounded-lg p-8 text-center hover:border-[#00c600] transition-colors">
            <FileSpreadsheet className="w-12 h-12 text-[#00c600] mx-auto mb-4" />
            <p className="text-gray-300 mb-4">Upload CSV, Excel, or Image file</p>
            <input
              type="file"
              onChange={handleFileChange}
              accept=".csv,.xlsx,.xls,.png,.jpg,.jpeg"
              className="hidden"
              id="file-upload"
            />
            <label 
              htmlFor="file-upload"
              className="inline-flex items-center gap-2 px-4 py-2 bg-[#333333] hover:bg-[#444444] text-white rounded-md cursor-pointer transition-colors font-medium"
            >
              <Upload className="w-4 h-4" />
              Choose File
            </label>
            {file && (
              <p className="text-[#00c600] mt-3 text-sm">{file.name}</p>
            )}
          </div>

          <div className="bg-[#333333] rounded-lg p-4">
            <p className="text-gray-400 text-sm">
              <strong className="text-white">AI-Powered Import:</strong> Our system will automatically extract lead information including names, emails, companies, and notes from your file.
            </p>
          </div>

          <div className="flex gap-3">
            <Button
              onClick={handleImport}
              disabled={!file || isProcessing}
              className="flex-1 bg-[#00c600] hover:bg-[#00dd00] text-[#212121] font-medium"
            >
              {isProcessing ? 'Importing...' : 'Import Leads'}
            </Button>
            <Button
              onClick={onClose}
              variant="outline"
              className="border-[#444444] text-gray-300 hover:bg-[#333333]"
            >
              Cancel
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}