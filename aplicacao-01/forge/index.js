function loadTextBase64(method, url) {
    return new Promise(function (resolve, reject) {
        let xhr = new XMLHttpRequest();
        xhr.open(method, url);
        xhr.onload = function () {
            if (this.status >= 200 && this.status < 300) {
                resolve(xhr.responseText);
            } else {
                reject({
                    status: this.status,
                    statusText: xhr.statusText
                });
            }
        };
        xhr.onerror = function () {
            reject({
                status: this.status,
                statusText: xhr.statusText
            });
        };
        xhr.send();
    });
}

async function getContentFromPKCS7(signedContent) {
    try {
        try {
            var p7 = forge.pkcs7.messageFromPem(signedContent);
            console.log(p7);
            console.debug(p7);
            var content = '';
            for (var bytes of p7.rawCapture.content.value[0].value) {
                content = content + bytes.value;
            }
            var base64 = btoa(content);
            return 'data:image/webp;base64, '+base64;
        } catch (error) {
            alert(error);
        }
    } catch (error) {
        throw error;
    }
}

async function verifyPKCS7(signedContent) {
    try {
        try {
            var p7 = forge.pkcs7.messageFromPem(signedContent);
            var content = '';
            for (var bytes of p7.rawCapture.content.value[0].value) {
                content = content + bytes.value;
            }
            var base64 = btoa(content);
            return 'data:image/webp;base64, '+base64;
        } catch (error) {
            alert(error);
        }
    } catch (error) {
        throw error;
    }
}

async function getSignersPKCS7(signedContent) {
    try {
        try {
            var p7 = forge.pkcs7.messageFromPem(signedContent);
            var signers = '';
            for (var certificate of p7.certificates) {
                for (var attribute of certificate.subject.attributes) {
                    if (attribute.type == '2.5.4.3') {
                        signers = signers + attribute.value + "; ";
                    }
                }
            }
            return signers.substring(0, signers.length-2);
        } catch (error) {
            alert(error);
        }
    } catch (error) {
        throw error;
    }
}

async function populateImage(file) {
    var signedContent = await loadTextBase64('GET', file);
    var content = await getContentFromPKCS7(signedContent);
    var signers = await getSignersPKCS7(signedContent);
    var image = document.querySelector('img');
    image.src = content;
    var caption = document.querySelector('figcaption');
    caption.innerHTML = 'Fonte: Site O Globo<\p>Assinador por ' + signers;
}

populateImage('./image.webp.p7m')