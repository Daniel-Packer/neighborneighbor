// filepath: /home/daniel/Documents/neighborneighbor/islands/DeleteButton.tsx
import { useState } from "preact/hooks";

interface DeleteButtonProps {
  id: string;
  onDelete: () => void;
}

export default function DeleteButton({ id, onDelete }: DeleteButtonProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  
  const handleDelete = async () => {
    if (isDeleting) return;
    
    const confirmDelete = confirm("Are you sure you want to delete this pairing?");
    if (!confirmDelete) return;
    
    try {
      setIsDeleting(true);
      
      const response = await fetch(`/api/pairings?id=${id}`, {
        method: "DELETE",
      });
      
      if (response.ok) {
        // Call the onDelete callback to notify parent component
        onDelete();
      } else {
        const errorData = await response.json();
        console.error("Error deleting pairing:", errorData);
        alert(`Failed to delete pairing: ${errorData.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error("Error deleting pairing:", error);
      alert("An error occurred while trying to delete the pairing. Please try again.");
    } finally {
      setIsDeleting(false);
    }
  };
  
  return (
    <button
      onClick={handleDelete}
      disabled={isDeleting}
      aria-label="Delete pairing"
      title="Delete pairing"
      class="absolute top-2 right-2 w-8 h-8 flex items-center justify-center rounded-full bg-red-100 text-red-600 hover:bg-red-200 focus:outline-none focus:ring-2 focus:ring-red-500"
    >
      {isDeleting ? (
        <svg class="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
      ) : (
        <svg class="h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      )}
    </button>
  );
}