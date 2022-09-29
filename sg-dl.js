const sg_user_expr = /soundgasm\.net\/u\/([^\/]+)\/[^\/]+/;
const sg_audio_expr = /[\'"]([^\'"]+media.soundgasm.net\/sounds\/[^\'"]+)[\'"]/;
const track_id_expr = /whyp\.it\/tracks\/([0-9]+)/;
const url_ext_expr = /\.[^.]+$/;
const bad_fname_chars_expr = /["/:\\<>|?*]/g;
const max_fname_len = 250;

// TODO: try to truncate friendy_fname by removing tags?

function update_status(message, error)
{
	dl_status = document.getElementById('dl_status');
	dl_btn = document.getElementById('dl_button');
	dl_status.innerHTML = message;
	if (error) {
		dl_status.style.color = 'red';
		dl_btn.disabled = false;
	}
	else {
		dl_status.style.color = 'lightgreen';
		dl_btn.disabled = true;
	}
};

function download_url_to_file(url, file_name)
{
	update_status('Downloading Audio', false);
	fetch(url).then((response) => {
		response.blob().then(blob => {
			blob_url = URL.createObjectURL(blob);
			const link_elem = document.createElement('a');
			document.body.appendChild(link_elem);
			link_elem.href = blob_url;
			link_elem.download = file_name;
			link_elem.style.display = 'none';
			link_elem.click();
			document.body.removeChild(link_elem);
			URL.revokeObjectURL(blob_url);
			update_status('Done', false);
			document.getElementById('dl_button').disabled = false;
		}).catch(() => {
			update_status('Failed to creat blob', true);
		});
	}).catch(() => {
		update_status('Failed to download audio', true);
	});
};

function title_to_fname(title)
{
	return title.replaceAll(bad_fname_chars_expr, '_');
};

function sg_download(url, username)
{
	update_status('Fetching soundgasm page', false);
	fetch('https://api.allorigins.win/raw?url=' + url).then((response) => {
		if (!response.ok) {
			update_status('Server returned ' + response.status.toString(), true);
			return;
		}
		response.text().then((sg_html) => {
			parser = new DOMParser();
			sg_doc = parser.parseFromString(sg_html, 'text/html');
			title_elem = sg_doc.querySelector('.jp-title');
			if (title_elem === null) {
				update_status('Failed to parse soundgasm page', true);
				return;
			}
			const title = title_elem.innerHTML;
			script_elems = sg_doc.querySelectorAll('script');
			found_audio_url = false;
			script_elems.forEach((elem) => {
				const sg_audio_match = elem.innerHTML.match(sg_audio_expr);
				if (sg_audio_match != null) {
					const audio_ext = sg_audio_match[1].match(url_ext_expr)[0];
					friendly_fname = title_to_fname(title);
					// truncate friendly_fname if needed
					if (friendly_fname.length + audio_ext.length > max_fname_len) {
						console.warn('truncating file name');
						friendly_fname = friendly_fname.substring(0, max_fname_len - audio_ext.length);
					}
					friendly_fname += audio_ext;
					download_url_to_file('https://api.allorigins.win/raw?url=' + sg_audio_match[1], friendly_fname);
					found_audio_url = true;
				}
			});
			if (!found_audio_url)
				update_status('Failed to parse soundgasm page', true);
		}).catch(() => {
			update_status('Failed to fetch soundgasm page', true);
		});
	}).catch(() => {
		update_status('Failed to fetch soundgasm page', true);
	});
}

function whyp_download(track_id)
{
	update_status('Fetching track info', false);
	fetch('https://api.allorigins.win/raw?url=https://api.whyp.it/api/tracks/' + track_id).then((response) => {
		if (!response.ok) {
			update_status('Server returned ' + response.status.toString(), true);
			return;
		}
		response.json().then((track_data) => {
			try {
				const audio_ext = track_data['track']['audio_url'].match(url_ext_expr)[0];
				friendly_fname = title_to_fname(track_data['track']['title']);
				// truncate friendly_fname if needed
				if (friendly_fname.length + audio_ext.length > max_fname_len) {
					console.warn('truncating file name');
					friendly_fname = friendly_fname.substring(0, max_fname_len - audio_ext.length);
				}
				friendly_fname += audio_ext;
				download_url_to_file('https://api.allorigins.win/raw?url=' + track_data['track']['audio_url'], friendly_fname);
			} catch(e) {
				update_status('Failed to parse response', true);
			}
		}).catch(() => {
			update_status('Failed to parse response', true);
		});
	}).catch(() => {
		update_status('Failed to fetch track info', true);
	});
}

function start_download()
{
	const url = document.getElementById('url_input').value;
	const sg_user_match = url.match(sg_user_expr);
	const track_id_match = url.match(track_id_expr);
	if (sg_user_match != null) {
		sg_download(url, sg_user_match[1]);
	}
	else if (track_id_match != null) {
		whyp_download(track_id_match[1]);
	}
	else {
		update_status('Unsupported URL', true);
	}
};