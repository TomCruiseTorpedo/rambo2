
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.4";

// Hardcoded credentials for rambo2 project (nvuxsdwpqrtglgxwrbqa)
const SUPABASE_URL = "https://nvuxsdwpqrtglgxwrbqa.supabase.co";
const SUPABASE_SERVICE_ROLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im52dXhzZHdwcXJ0Z2xneHdyYnFhIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MzY3ODUzNCwiZXhwIjoyMDc5MjU0NTM0fQ.hUT6jO06TfbOIzlHYu6DMgAYUYEkuFSrbL8gk1-lmus";

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    console.error("Missing credentials");
    Deno.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function uploadMapping() {
    const mappingPath = "./supabase/field_mappings/t661_critical_fields.json";

    try {
        const mappingData = await Deno.readTextFile(mappingPath);
        console.log("Read mapping file successfully.");

        // Create bucket if it doesn't exist
        const { data: buckets, error: listError } = await supabase.storage.listBuckets();
        if (listError) {
            console.error("Error listing buckets:", listError);
            return;
        }

        const bucketName = "field_mappings";
        const bucketExists = buckets.some(b => b.name === bucketName);

        if (!bucketExists) {
            console.log(`Creating bucket '${bucketName}'...`);
            const { data, error: createError } = await supabase.storage.createBucket(bucketName, {
                public: true,
                fileSizeLimit: 1048576, // 1MB
                allowedMimeTypes: ['application/json']
            });
            if (createError) {
                console.error("Error creating bucket:", createError);
                return;
            }
            console.log("Bucket created.");
        } else {
            console.log(`Bucket '${bucketName}' already exists.`);
        }

        // Upload file
        console.log("Uploading mapping file...");
        const { data, error } = await supabase.storage
            .from(bucketName)
            .upload("t661_critical_fields.json", mappingData, {
                contentType: "application/json",
                upsert: true
            });

        if (error) {
            console.error("Error uploading file:", error);
        } else {
            console.log("File uploaded successfully:", data);
        }

    } catch (error) {
        console.error("Error reading file:", error);
    }
}

uploadMapping();
