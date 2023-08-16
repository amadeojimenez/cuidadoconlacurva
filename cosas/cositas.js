const axios = require('axios');
const { get } = require('request');

const getAchtungHTML = async () => {
    const { data } = await axios.get('https://achtung.life/');
    console.log(data)
    return data;
}

getAchtungHTML();