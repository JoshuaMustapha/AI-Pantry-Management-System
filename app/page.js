'use client'
import React, {useState, useRef, useEffect} from 'react'
import Image from 'next/image'
import {collection, doc, getDocs, getDoc, query, setDoc, deleteDoc} from 'firebase/firestore'
import {Box, Button, Modal, TextField, Typography} from "@mui/material" 
import {Stack} from "@mui/material"
import { firestore, storage } from '@/firebase'
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import Camera from '@/cam';
import * as dotenv from 'dotenv'
const { OpenAI } = require('openai');




export default function Home() {
  const [inventory, setInventory] = useState([])
  const [open, setOpen] = useState([true])
  const [itemName, setItemName] = useState([''])
  const camera = useRef(null);
  const [image, setImage] = useState(null);


  const updateInventory = async () => {
    try {
      const snapshot = query(collection(firestore, 'inventory'))
      const docs = await getDocs(snapshot)
      const inventoryList = []
      docs.forEach((doc) => {
        inventoryList.push({
          name: doc.id,
          ...doc.data(),
        })
      })
      setInventory(inventoryList)
    } catch (error) {
      console.error("Error updating inventory:", error)
    }
  }



  const addItem = async (item) =>{
    const docRef = doc(collection(firestore, 'inventory'), item)
    const docSnap = await getDoc(docRef) 
    if (docSnap.exists()){
      const {quantity} = docSnap.data()
      await setDoc(docRef, {quantity: quantity + 1})
    } else {
      await setDoc(docRef, {quantity: 1})
    }

    await updateInventory()
  }

  const removeItem = async (item) =>{
    const docRef = doc(collection(firestore, 'inventory'), item)
    const docSnap = await getDoc(docRef) 

    if(docSnap.exists()){
      const {quantity} = docSnap.data()
      if (quantity === 1) {
        await deleteDoc(docRef)
      } else {
        await setDoc(docRef, {quantity: quantity - 1})
      }
    }

    await updateInventory()
  }

  useEffect(() => {
    updateInventory()
  }, [])

  const handleOpen = () => setOpen(true)
  const handleClose = () => setOpen(false)


  const identifyImage = async (imageUrl) => {
    try {
      console.log('Sending image URL to API:', imageUrl);
      const response = await fetch('/api/openai', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ imageUrl }),
      });
  
      if (!response.ok) {
        const errorData = await response.json();
        console.error('API Error:', errorData);
        throw new Error(`HTTP error! status: ${response.status}, message: ${errorData.error}`);
      }
  
      const data = await response.json();
      console.log('Identified data:', data);
      if (data.result) {
        await addItem(data.result);
      }
    } catch (error) {
      console.error('Error identifying image:', error);
    }
  };

  const handleTakePhoto = async () => {
    try {
      if (camera.current) {
        const photo = camera.current.takePhoto();
        setImage(photo);
        // Convert photo to Blob
        const response = await fetch(photo);
        const blob = await response.blob();
  
        // Upload Blob to Firebase Storage
        const storageRef = ref(storage, 'photos/' + Date.now());
        await uploadBytes(storageRef, blob);
  
        // Get URL of the uploaded image
        const downloadURL = await getDownloadURL(storageRef);
        console.log('Uploaded image URL:', downloadURL);
  
        // Validate URL
        if (!downloadURL || typeof downloadURL !== 'string') {
          throw new Error('Invalid image URL');
        }
  
        // Identify the image using OpenAI API
        await identifyImage(downloadURL);
      }
    } catch (error) {
      console.error('Error taking or processing photo:', error);
    }
  };


  return (
    <Box width = "100vw" height = "100vh"
    display={"flex"}
    justifyContent={"center"}
    flexDirection={"column"}
    alignItems={"center"}
    gap={2}
    >
      <Modal
      open={open}
      onClose={handleClose}
      >
        <Box 
        position="absolute" 
        top="50%" 
        left = "50%"
        width={400}
        bgcolor = "white"
        border="2px solid #000"
        boxShadow={24}
        p={4}
        display="flex"
        flexDirection='column'
        gap={3}
        sx={{
          transform: 'translate(-50%, -50%)'
        }}
        >
          <Typography variant='h6'>Add Item: </Typography>
          <Button variant="outlined" onClick={handleTakePhoto}>Take a Photo</Button>
          {image && <img src={image} alt="Taken photo" />}
          <Stack direction="row" spacing={2} alignItems="center">
            {/* <Button variant="outlined" onClick={()=>{
              identifyImage(downloadURL)
              setItemName('')
              handleClose()
            }}>Add Photo</Button> */}
            <Typography>Or</Typography>
          </Stack>
          <Stack width="100" detection="row" spacing = {2}>
            <TextField 
            variant="outlined" 
            fullWidth
            value={itemName}
            onChange={(e)=>{
              setItemName(e.target.value)
            }}
            />
            <Button
            variant = "outlined" onClick={()=>{
              addItem(itemName)
              setItemName('')
              handleClose()
            }}>Add (Manually)</Button>
          </Stack>
          <Camera ref={camera} />
        </Box>
      </Modal>
      <Button variant="contained" onClick={()=>{
        handleOpen()
      }}>
        Add New Item
      </Button>
      <Box border="1px solid #333">
        <Box
        width='800px'
        height='100px'
        bgcolor='#ADD8E6'
        display="flex"
        alignItems="center"
        justifyContent='center'
        >
        <Typography variant = 'h2' color='#333'>Pantry Items</Typography>
        </Box>
      <Stack width = "800px" height = '300px' spacing={2} overflow="auto">
        {
          inventory.map(({name,quantity})=>(
            <Box 
            key={name} 
            width="100%" 
            minHeight="150px"
            display="flex"
            alignItems="center"
            justifyContent="space-between"
            bgcolor='#f0f0f0'
            padding={5}
            >
              <Typography 
              variant="h3" 
              color = '#333'
              textAlign="center"
              >
                {name.charAt(0).toUpperCase() + name.slice(1)}
              </Typography>
              <Typography 
              variant="h3" 
              color = '#333'
              textAlign="center"
              >
                {quantity}
              </Typography>
              <Stack direction="row" spacing={2}>
              <Button variant= "contained" onClick={() => {
                addItem(name)
              }}
              >Add</Button>
              <Button variant= "contained" onClick={() => {
                removeItem(name)
              }}
              >Remove</Button>
              </Stack>
            </Box>
          ))}
      </Stack>
      </Box>
    </Box>
  )
}
