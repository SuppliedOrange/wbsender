addEventListener("DOMContentLoaded", () => { // When the webpage has finished loading

    // The script does not recognize "$" without this.
    jQuery.noConflict()

    // Creating our popper (tooltip)
    const profilePictureUploader = document.querySelector('#profile-picture');
    
    if (!('indexedDB' in window)) {
        return document.write("This browser does not support indexeddb :(")
      }

    // Listen for changes in the image uploading module
    jQuery('#profile-picture').on('change', async function (event) {

        let files = event.target.files;

        profilePictureUploader.validImage = false;

        if (files.length) {

            if (!files[0].type.includes('image')) {

                profilePictureUploader.className = 'btn btn-outline-danger btn-sm'

                if (!document.querySelector("#image-error").className.includes("show")) await flashTooltip("#image-error", 5000);

            }

            else {
                profilePictureUploader.className = 'btn btn-outline-success btn-sm'
                profilePictureUploader.validImage = true;
            }
        }

        else profilePictureUploader.className = 'btn btn-outline-danger btn-sm'

    })

    jQuery('#message').on('change', function () { // Change the status of the send button based on whether or not the text field has characters
        let send_button = document.querySelector('#send-button');
        if (send_button.sending) return;
        send_button.disabled = document.querySelector('#message').value.trim().length ? undefined : true;
    })

    jQuery('#discord-webhook-url').on('change', function () { // Change the status of the send button based on whether or not the text field has characters
        let send_button = document.querySelector('#settings-save-button');
        if (send_button.sending) return;
        send_button.disabled = document.querySelector('#discord-webhook-url').value.trim().length ? undefined : true;
    })
    

})

async function startRocket() {
    let send_button = document.querySelector('#send-button');
    send_button.sending = true;
    send_button.disabled = true;
    send_button.children[0].className = 'animate__animated animate__faster animate__zoomOut'
    await new Promise(r => setTimeout(r, 300));
    send_button.children[0].innerText = '🚀';
    send_button.children[0].className = 'animate__animated animate__faster animate__bounceIn'
}

async function stopRocket() {
    let send_button = document.querySelector('#send-button');
    send_button.sending = undefined;
    send_button.children[0].className = 'animate__animated animate__slow animate__zoomOutRight'
    await new Promise(r => setTimeout(r, 1200));
    send_button.children[0].innerText = 'Send';
    send_button.children[0].className = 'animate__animated animate__faster animate__bounceIn'
    send_button.sending = false;
}

async function uploadToImgur(file, client_id) {

    try {

        let image = new FormData()
        image.append("image", file)

        let response = await fetch("https://api.imgur.com/3/image/", {
            method: "post",
            headers: {
                Authorization: `Client-ID ${client_id}`
            },
            body: image
        })

        response = await response.json();
        return response.data.link;

    }
    catch (e) { return null }

}

async function discord_message(details, webhook_url) {
    return (await fetch(
        webhook_url,
        {
            method: "post",
            headers: {
                'Content-Type': 'application/json',
              },
            body: JSON.stringify({
                username: details.username,
                avatar_url:
                  details.pfp,
                content:
                  details.message,
            })
        }
    )).status;
}

function sendingSuccess(msg) {
    document.querySelector('#send-status').className = "collapse customtooltip success";
    document.querySelector('#send-status').innerText = msg;
}

function sendingFailure(msg) {
    document.querySelector('#send-status').className = "collapse customtooltip error";
    document.querySelector('#send-status').innerText = msg;
}

async function send() {

    sendingSuccess("Sent!") // Assume it's a successful operation

    const config = await getSettings();
    if (!config) {
        sendingFailure("Provide a Discord Webhook URL in settings!");
        return await flashTooltip('#send-status', 5000);
    }

    await startRocket(); // Lock the send button and show the rocket
    progress(0); // Reset progress bar
    toggleCollapsable('.progress') // Uncollapse progress bar
    showProgressBar() // Show progress bar

    // Find username
    increaseProgress(16.6);
    const username = document.querySelector("#username").value.trim() || "WBSender"

    // Find profile picture
    increaseProgress(16.6);
    const profilePictureUploader = document.querySelector('#profile-picture');
    const pfpFile = (profilePictureUploader.validImage) ? profilePictureUploader.files[0] : null;
    let pfp = null;

    // Upload to imgur and get link
    increaseProgress(16.6)
    if (pfpFile && config[0].imgur_client_id) pfp = await uploadToImgur(pfpFile, config[0].imgur_client_id);
    if (pfpFile && config[0].imgur_client_id && !pfp) sendingFailure("Sent message without profile picture")

    // Find message
    increaseProgress(16.6)
    const message = document.querySelector("#message").value;

    // Create the options
    const options = {
        message: message,
        username: username,
        pfp: pfp
    }

    // Send the discord message
    increaseProgress(16.6)
    let discordMessageStatus = await discord_message(options, config[0].discord_webhook_url);
    if (!discordMessageStatus == 200) sendingFailure(`Could not send message (Error ${discordMessageStatus})`);

    // Finish Progress Bar
    increaseProgress(16.6)

    // Log the mesage if sent
    if (document.querySelector('#send-status').classList.contains('success')) logMessage(options)

    // Remove all elements
    hideProgressBar()
    toggleCollapsable('.progress')

    await new Promise(r => setTimeout(r, 300)); // Wait for the animation to kick in

    // Stop the operation
    await stopRocket();

    // Trigger status message
    await flashTooltip('#send-status', 5000);

}

async function flashTooltip(id, ms) {

    new bootstrap.Collapse(id, {
        toggle: false
    })

    jQuery(id).collapse({ toggle: false })
    toggleCollapsable(id);

    await new Promise(r => setTimeout(r, ms));

    toggleCollapsable(id);

}

function openDatabase() {
    return new Promise((resolve, reject) => {
      
      const request = indexedDB.open('storage', 1);
      
      request.onerror = () => reject(request.error);
      
      request.onsuccess = () => resolve(request.result);
      
      request.onupgradeneeded = (event) => {

        const db = event.target.result;
        
        if (!db.objectStoreNames.contains('logs')) {
          const logs = db.createObjectStore('logs', {keyPath: 'timestamp'});
          logs.createIndex('message', 'message', {unique: false});
          logs.createIndex('username', 'username', {unique: false});
          logs.createIndex('pfp', 'pfp', {unique: false});
        }
        
        if (!db.objectStoreNames.contains('settings')) {
          const settings = db.createObjectStore('settings', {keyPath: 'discord_webhook_url', autoIncrement: false});
          settings.createIndex('imgur_client_id', 'imgur_client_id');
        }

      };

    });
    
}

async function getHistory() {
    try {
      const db = await openDatabase();
      const tx = db.transaction('logs', 'readonly');
      const logs = tx.objectStore('logs');
  
      return new Promise((resolve, reject) => {
        const request = logs.getAll();
  
        request.onsuccess = () => {
          const history = request.result;
          resolve(history);
        };
  
        request.onerror = (event) => {
          console.log('Error:', event.target.error);
          reject(null);
        };
      });
    } catch (error) {
      console.log('Error:', error);
      return null;
    }
}

async function getSettings() {
    
    try {
        const db = await openDatabase();
        const tx = db.transaction('settings', 'readonly');
        const logs = tx.objectStore('settings');
    
        return new Promise((resolve, reject) => {
          const request = logs.getAll();
    
          request.onsuccess = () => {
            const history = request.result;
            resolve(history);
          };
    
          request.onerror = (event) => {
            console.log('Error:', event.target.error);
            reject(null);
          };

        });

      } catch (error) {
        console.log('Error:', error);
        return null;
      }

}

async function saveSettings() {

    let config = {
        discord_webhook_url: document.getElementById('discord-webhook-url').value,
        imgur_client_id: document.getElementById('imgur-api-client-id').value || null
    }

    try {
        const db = await openDatabase();
        const tx = db.transaction('settings', 'readwrite');
        const settings = tx.objectStore('settings');
        settings.clear();
        settings.add(config, "1");

    } catch (error) {
        console.log('Error:', error);
    }

}

async function createSettingsModal() {

    const settings = await getSettings();

    if (settings) {
        document.getElementById("discord-webhook-url").value = settings[0].discord_webhook_url || '';
        document.getElementById("imgur-api-client-id").value = settings[0].imgur_client_id || '';
    }

}

async function createHistoryModal() {

    document.getElementById("history-modal-content").innerHTML = ''
    document.getElementById("history-modal-navbar-links").innerHTML = ''

    let history = await getHistory();

    for (const log of history.reverse()) {

        let html_id = `history_id_${log.timestamp}`;

        let table_row = createHistoryMessage(html_id, log);

        let table_body = document.getElementById("history-modal-content");
        table_body.appendChild(table_row);

        let navbar_link = createHistoryNavbarLink(html_id, log.timestamp);

        let navbar_link_list = document.getElementById("history-modal-navbar-links");
        navbar_link_list.appendChild(navbar_link);

    }

}

function createHistoryMessage(id, details) {

    details.pfp = details.pfp || './default_pfp.png';
    let calendar_time = moment(details.timestamp).calendar();

    return createHistoryMessageInnerTableRow( id, calendar_time, details.pfp, details.username, details.message );

}

function createHistoryNavbarLink(id, timestamp) {

    // <a class="nav-link" href="#some-id"> Test 1 </a>

    let relative_time = moment(timestamp).fromNow();

    const a = document.createElement('a');

    a.classList = ['nav-link my-3'];
    a.href = '#' + id;

    a.innerText = relative_time;

    return a;

}

function createHistoryMessageInnerTableRow(id, relative_time, imageSrc, author, content) {

    const tr = document.createElement('tr');

    tr.classList.add('my-5');

    const div = document.createElement('div');

    div.classList.add('mb-4');

    const h5Title = document.createElement('h5');
    
    h5Title.classList.add('fw-bold');
    h5Title.setAttribute('id', id);
    h5Title.textContent = relative_time;

    const divFlex = document.createElement('div');

    divFlex.classList.add('d-flex', 'flex-row', 'align-content-start');
    
    const img = document.createElement('img');

    img.classList.add('pfp', 'rounded-circle', 'me-2');
    img.setAttribute('src', imageSrc);

    const h5Author = document.createElement('h5');

    h5Author.classList.add('fw-medium', 'mt-1');
    h5Author.setAttribute('id', 'some-id');
    h5Author.textContent = author;

    const contentEl = document.createElement('div');

    contentEl.innerHTML = content;

    divFlex.appendChild(img);
    divFlex.appendChild(h5Author);

    div.appendChild(h5Title);
    div.appendChild(divFlex);
    div.appendChild(contentEl);

    tr.appendChild(div);
  
    return tr;
  }
  
  

async function logMessage(details) {
    details.timestamp = new Date().getTime();

    try {
        const db = await openDatabase();
        const tx = db.transaction('logs', 'readwrite');
        const logs = tx.objectStore('logs');
        logs.add(details);

    } catch (error) {
        console.log('Error:', error);
    }
}


async function clearLogs() {

    sendingFailure("Your history was cleared")
    await flashTooltip('#send-status', 5000);

    return openDatabase().then(async db => {
        const tx = db.transaction('logs', 'readwrite');
        const logs = tx.objectStore('logs');
        logs.clear();
        await createHistoryModal()

    }).catch(error => {
        console.log('Error:', error);
    });

}
  
function showProgressBar() {
    document.querySelector('.progress').className = 'collapse progress w-50 animate__animated mt-1 animate__fadeIn'
}

function hideProgressBar() {
    document.querySelector('.progress').className = 'collapse progress w-50 animate__animated mt-1 animate__fadeOut'
}

function toggleCollapsable(id) {
    jQuery(id).collapse('toggle')
}

function progress(percent) {
    document.querySelector(".progress-bar").style.width = percent.toString() + '%';
}

function increaseProgress(percent) {
    let currentWidth = parseInt( document.querySelector('.progress-bar').style.width.slice(0,-1) );
    let newWidth = currentWidth + percent;
    if (newWidth > 100) newWidth = 100;
    else if (newWidth < 0) newWidth = 0;
    document.querySelector('.progress-bar').style.width = newWidth.toString() + '%'
}