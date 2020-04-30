import { useState, useEffect } from 'react';
import { useCamera } from '@ionic/react-hooks/camera';
import { useFilesystem, base64FromPath } from '@ionic/react-hooks/filesystem';
import { useStorage } from '@ionic/react-hooks/storage';
import { isPlatform } from '@ionic/react';
import {
  CameraResultType,
  CameraSource,
  CameraPhoto,
  Capacitor,
  FilesystemDirectory,
} from '@capacitor/core';

//define constant to act as the key for the storage
const PHOTO_STORAGE = 'photos';

export function usePhotoGallery() {
  const { getPhoto } = useCamera();
  const { deleteFile, getUri, readFile, writeFile } = useFilesystem();
  const { get, set } = useStorage(); //access the get and set methods from the useStorage hook.
  const [photos, setPhotos] = useState<Photo[]>([]);

  const savePicture = async (
    photo: CameraPhoto, //object
    fileName: string
  ): Promise<Photo> => {
    const base64Data = await base64FromPath(photo.webPath!);
    const savedFile = await writeFile({
      path: fileName,
      data: base64Data,
      directory: FilesystemDirectory.Data,
    });
    // Use webPath to display the new image instead of base64 since it's
    // already loaded into memory
    return {
      filepath: fileName,
      webviewPath: photo.webPath,
    };
  };

  useEffect(() => {
    const loadSaved = async () => {
      const photoString = await get('photos');
      const photos = (photoString ? JSON.parse(photoString) : []) as Photo[];

      for (let photo of photos) {
        const file = await readFile({
          path: photo.filepath,
          directory: FilesystemDirectory.Data,
        });
        photo.base64 = `data:image/jpeg;base64,${file.data}`;
      }
      setPhotos(photos);
    };
    loadSaved(); // we have to call the async function from within the hook as the hook callback can't be asynchronous itself.
  }, [get, readFile]);
  // [get, readFile] is a dependancy array. because we've passed in a dependency array, the effect will only run if the dependency gets updated rather than each time the component renders.
  // since get and readFile will never change, the data will only be called once.

  const takePhoto = async () => {
    const cameraPhoto = await getPhoto({
      resultType: CameraResultType.Uri,
      source: CameraSource.Camera,
      quality: 100,
    });
    const fileName = new Date().getTime() + '.jpeg';
    const savedFileImage = await savePicture(cameraPhoto, fileName);
    const newPhotos = [savedFileImage, ...photos];

    setPhotos(newPhotos);

    //adding set call to save the photos array. now data persists if the app is closed.
    set(
      PHOTO_STORAGE,
      JSON.stringify(
        newPhotos.map((p) => {
          //don't save the base64 representation of the photo data,
          //since it's already saved on the filesystem
          const photoCopy = { ...p };
          delete photoCopy.base64;
          return photoCopy;
        })
      )
    );
  };

  return {
    takePhoto,
    photos,
  };
}

export interface Photo {
  filepath: string;
  webviewPath?: string;
  base64?: string;
}
