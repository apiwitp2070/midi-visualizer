import Upload from "@/components/common/Upload";
import { useMidiUpload } from "@/hooks/useMidiUpload";

export default function MidiUpload({ compact }: { compact?: boolean }) {
  const { handleFileUpload } = useMidiUpload();

  return <Upload compact={compact} onChange={handleFileUpload} />;
}
