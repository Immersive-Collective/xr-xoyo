#!/bin/bash

# Check for correct number of arguments
if [ "$#" -ne 2 ]; then
    echo "Usage: $0 <source_folder> <destination_folder>"
    exit 1
fi

# Variables for source and destination
SOURCE_FOLDER=$1
DESTINATION_FOLDER=$2

# Check if source folder exists
if [ ! -d "$SOURCE_FOLDER" ]; then
    echo "Error: Source folder '$SOURCE_FOLDER' does not exist."
    exit 1
fi

# Use rsync to synchronize folders
rsync -av -e "ssh -p 18021" --exclude='*.map' --exclude='*.blend*' --exclude='.DS_Store' --progress "$SOURCE_FOLDER" "$DESTINATION_FOLDER"

# Check rsync exit status
if [ $? -eq 0 ]; then
  echo "Successfully deployed files from $SOURCE_FOLDER to $DESTINATION_FOLDER."
else
  echo "An error occurred while deploying files. See above for details."
fi



# 
# rsync -av -e "ssh -p 18021" --exclude='*.map' --exclude='*.blend*' --exclude='.DS_Store' /Users/smielniczuk/Documents/works/metaboy-demos/snapshots/ root@metaboy.tech:/var/www/metaboy.tech/demos
