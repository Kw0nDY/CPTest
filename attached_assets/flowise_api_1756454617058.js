// use FormData to upload files
let formData = new FormData();
formData.append("files", input.files[0])
formData.append("columnName", "example")
formData.append("metadata", { "key": "val" })
formData.append("omitMetadataKeys", "example")

async function query(formData) {
    const response = await fetch(
        "http://220.118.23.185:3000/api/v1/vector/upsert/9e85772e-dc56-4b4d-bb00-e18aeb80a484",
        {
            method: "POST",
            body: formData
        }
    );
    const result = await response.json();
    return result;
}

query(formData).then((response) => {
    console.log(response);
});