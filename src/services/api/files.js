import apiClient from "../apiClient";
import unwrap from "../unwrap";

/**
 * Folder 2 — file attachments for the composer.
 */

/**
 * Upload one file. The API expects multipart form-data with the key `file`.
 * @param {File} file
 * @returns {Promise<object>} { fileId, fileName, sizeBytes }
 */
export const uploadFile = async (file) => {
  const form = new FormData();
  form.append("file", file);
  // Override the client's default application/json header: with it, axios
  // serialises FormData to JSON. For multipart, axios drops the header in the
  // browser so the browser can add the boundary itself.
  return unwrap(
    await apiClient.post("/files/upload", form, {
      headers: { "Content-Type": "multipart/form-data" },
    })
  );
};

const filesApi = { uploadFile };

export default filesApi;
