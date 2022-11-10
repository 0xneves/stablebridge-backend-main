# zip the current folder to backend.zip
zip -r backend.zip .

# copy the zip file to the GCP instance
gcloud compute --project maicon-moreira-project2 scp backend.zip ethereum-sp:~/

# remove old backend folder from the GCP instance
gcloud compute --project maicon-moreira-project2 ssh ethereum-sp --command "rm -rf backend"

# unzip the file
gcloud compute --project maicon-moreira-project2 ssh ethereum-sp --command "unzip backend.zip -d backend"