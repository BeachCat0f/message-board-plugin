// Dashboard Message Board Admin JavaScript
(function($) {
    'use strict';
    
    var DMB = {
        init: function() {
            this.bindEvents();
            this.initializeViews();
            this.setupWPEditor();
            this.ensureVisualTabDefault();
            
            // Additional force visibility after a short delay
            setTimeout(function() {
                DMB.forceTextVisibility();
            }, 300);
        },
        
        bindEvents: function() {
            // Form submission
            $('#dmb-create-form').on('submit', this.handleCreateNote);
            
            // Navigation
            $('.dmb-view-all').on('click', this.showAllNotes);
            $('.dmb-create-new').on('click', this.showCreateForm);
            
            // Visibility toggle
            $('input[name="visibility"]').on('change', this.toggleUserSelection);
            
            // Note interactions
            $(document).on('click', '.dmb-note-item', this.viewNote);
            $(document).on('click', '.dmb-edit-note', this.editNote);
            $(document).on('click', '.dmb-delete-note', this.deleteNote);
            $(document).on('click', '.dmb-back-to-list', this.showAllNotes);
            $(document).on('submit', '#dmb-edit-form', this.handleUpdateNote);
            
            // Quick view from recent notes
            $(document).on('click', '.dmb-quick-view-note', this.quickViewNote);
            
            // Admin page interactions
            $(document).on('click', '.dmb-note-title', this.adminViewNoteFromTitle);
            $(document).on('click', '.dmb-admin-view-note', this.adminViewNote);
            $(document).on('click', '.dmb-admin-edit-note', this.adminEditNote);
            $(document).on('click', '.dmb-admin-delete-note', this.adminDeleteNote);
        },
        
        initializeViews: function() {
            // Show create form by default
            this.showView('dmb-create-note');
        },
        
        ensureVisualTabDefault: function() {
            // Ensure Visual tab is selected by default for all editors
            setTimeout(function() {
                $('.wp-editor-wrap').each(function() {
                    var $wrap = $(this);
                    var editorId = $wrap.find('.wp-editor-area').attr('id');
                    
                    if (editorId) {
                        // Force Visual mode (tmce-active class)
                        $wrap.removeClass('html-active').addClass('tmce-active');
                        
                        // Make sure the Visual tab button appears active
                        $wrap.find('.switch-tmce').addClass('switch-editor-active');
                        $wrap.find('.switch-html').removeClass('switch-editor-active');
                        
                        // Ensure textarea is visible and has proper styling
                        var $textarea = $wrap.find('.wp-editor-area');
                        $textarea.css({
                            'color': '#333',
                            'background-color': '#fff',
                            'visibility': 'visible',
                            'opacity': '1',
                            'display': 'block',
                            'font-size': '13px',
                            'line-height': '1.4'
                        });
                        
                        // If TinyMCE is available, initialize or switch to it
                        if (typeof tinyMCE !== 'undefined') {
                            var editor = tinyMCE.get(editorId);
                            if (editor) {
                                if (editor.isHidden()) {
                                    editor.show();
                                }
                            } else {
                                // Initialize TinyMCE if not already done
                                if (typeof window.switchEditors !== 'undefined') {
                                    window.switchEditors.go(editorId, 'tmce');
                                }
                            }
                        }
                    }
                });
                
                // Additional check to force text visibility
                DMB.forceTextVisibility();
            }, 100);
        },
        
        getEditorContent: function(editorId) {
            var content = '';
            var editorWrap = $('#wp-' + editorId + '-wrap');
            
            if (editorWrap.length) {
                // Check if we're in Visual mode (tmce-active) or Code mode (html-active)
                if (editorWrap.hasClass('html-active')) {
                    // Code/HTML mode - get content from textarea
                    content = $('#' + editorId).val();
                } else if (editorWrap.hasClass('tmce-active')) {
                    // Visual mode - get content from TinyMCE if available
                    if (typeof tinyMCE !== 'undefined') {
                        var editor = tinyMCE.get(editorId);
                        if (editor && !editor.isHidden()) {
                            content = editor.getContent();
                        } else {
                            // Fallback to textarea
                            content = $('#' + editorId).val();
                        }
                    } else {
                        content = $('#' + editorId).val();
                    }
                } else {
                    // Default fallback - try TinyMCE first, then textarea
                    if (typeof tinyMCE !== 'undefined') {
                        var editor = tinyMCE.get(editorId);
                        if (editor && !editor.isHidden()) {
                            content = editor.getContent();
                        } else {
                            content = $('#' + editorId).val();
                        }
                    } else {
                        content = $('#' + editorId).val();
                    }
                }
            } else {
                // No wrapper found, use basic fallback
                if (typeof tinyMCE !== 'undefined') {
                    var editor = tinyMCE.get(editorId);
                    if (editor) {
                        content = editor.getContent();
                    } else {
                        content = $('#' + editorId).val();
                    }
                } else {
                    content = $('#' + editorId).val();
                }
            }
            
            return content;
        },

        forceTextVisibility: function() {
            // Force all editor textareas to be visible
            $('.wp-editor-area').each(function() {
                $(this).css({
                    'color': '#333 !important',
                    'background-color': '#fff !important',
                    'visibility': 'visible !important',
                    'opacity': '1 !important',
                    'display': 'block !important',
                    'font-size': '13px',
                    'padding': '15px',
                    'border': '1px solid #ddd',
                    'width': '100%',
                    'box-sizing': 'border-box'
                });
            });
            
            // Force visibility for both Visual and Code tabs
            $('.wp-editor-wrap.html-active .wp-editor-area').css({
                'background-color': '#f9f9f9 !important',
                'color': '#23282d !important'
            });
            
            $('.wp-editor-wrap.tmce-active .wp-editor-area').css({
                'background-color': '#fff !important',
                'color': '#333 !important'
            });
        },
        
        showView: function(viewId) {
            $('.dmb-view').removeClass('active');
            $('#' + viewId).addClass('active');
        },
        
        toggleUserSelection: function() {
            if ($(this).val() === 'specific') {
                $('#dmb-user-selection').slideDown();
            } else {
                $('#dmb-user-selection').slideUp();
            }
        },
        
        showCreateForm: function(e) {
            e.preventDefault();
            DMB.showView('dmb-create-note');
            $('#dmb-create-form')[0].reset();
            $('#dmb-user-selection').hide();
            
            // Reset editor content and ensure Visual tab is active
            setTimeout(function() {
                if (typeof tinyMCE !== 'undefined') {
                    var editor = tinyMCE.get('dmb-note-content');
                    if (editor) {
                        editor.setContent('');
                    }
                }
                // Reset textarea as well
                $('#dmb-note-content').val('');
                
                // Ensure Visual tab is selected and text is visible
                DMB.ensureVisualTabDefault();
                DMB.forceTextVisibility();
            }, 100);
        },
        
        showAllNotes: function(e) {
            e.preventDefault();
            DMB.showView('dmb-notes-list');
            DMB.loadNotes();
        },
        
        loadNotes: function() {
            $('#dmb-notes-container').html('<p>Loading notes...</p>');
            
            $.ajax({
                url: dmb_ajax.ajax_url,
                type: 'POST',
                data: {
                    action: 'dmb_get_notes',
                    nonce: dmb_ajax.nonce
                },
                success: function(response) {
                    if (response.success) {
                        DMB.displayNotes(response.data);
                    } else {
                        $('#dmb-notes-container').html('<p>Error loading notes.</p>');
                    }
                },
                error: function() {
                    $('#dmb-notes-container').html('<p>Error loading notes.</p>');
                }
            });
        },
        
        displayNotes: function(notes) {
            var html = '';
            
            if (notes.length === 0) {
                html = '<p>No notes found. Create your first note!</p>';
            } else {
                html = '<div class="dmb-notes-list">';
                $.each(notes, function(index, note) {
                    html += '<div class="dmb-note-item" data-note-id="' + note.id + '">';
                    html += '<h5>' + DMB.escapeHtml(note.title) + '</h5>';
                    html += '<div class="dmb-note-meta">';
                    html += '<span class="dmb-note-date">' + note.date + '</span>';
                    html += '<span class="dmb-note-author"> by ' + DMB.escapeHtml(note.author) + '</span>';
                    html += '</div>';
                    html += '<div class="dmb-note-excerpt">' + DMB.escapeHtml(note.excerpt) + '</div>';
                    html += '</div>';
                });
                html += '</div>';
            }
            
            $('#dmb-notes-container').html(html);
        },
        
        viewNote: function(e) {
            e.preventDefault();
            var noteId = $(this).data('note-id');
            
            $.ajax({
                url: dmb_ajax.ajax_url,
                type: 'POST',
                data: {
                    action: 'dmb_get_note',
                    note_id: noteId,
                    nonce: dmb_ajax.nonce
                },
                success: function(response) {
                    if (response.success) {
                        DMB.displaySingleNote(response.data);
                    } else {
                        alert(response.data.message);
                    }
                },
                error: function() {
                    alert('Error loading note.');
                }
            });
        },
        
        displaySingleNote: function(note) {
            var html = '<div class="dmb-single-note-content">';
            html += '<button class="button dmb-back-to-list">← Back to All Notes</button>';
            html += '<h3>' + DMB.escapeHtml(note.title) + '</h3>';
            html += '<div class="dmb-note-meta">';
            html += '<span class="dmb-note-date">' + note.date + '</span>';
            html += '<span class="dmb-note-author"> by ' + DMB.escapeHtml(note.author) + '</span>';
            html += '</div>';
            html += '<div class="dmb-note-content">' + note.content + '</div>';
            
            if (note.visible_to.length > 0) {
                html += '<div class="dmb-visibility-info">';
                html += '<strong>Visible to:</strong> All Administrators and ' + DMB.escapeHtml(note.visible_to.join(', '));
                html += '</div>';
            } else {
                html += '<div class="dmb-visibility-info">';
                html += '<strong>Visible to:</strong> All Administrators';
                html += '</div>';
            }
            
            if (note.can_edit) {
                html += '<div class="dmb-note-actions">';
                html += '<button style="margin: 0px 5px 0px 0px;" class="button dmb-edit-note" data-note-id="' + note.id + '">Edit Note</button>';
                html += '<button class="button dmb-delete-note" data-note-id="' + note.id + '">Delete Note</button>';
                html += '</div>';
            }
            
            html += '</div>';
            
            $('#dmb-single-note').html(html);
            DMB.showView('dmb-single-note');
        },
        
        editNote: function(e) {
            e.preventDefault();
            var noteId = $(this).data('note-id');
            
            $.ajax({
                url: dmb_ajax.ajax_url,
                type: 'POST',
                data: {
                    action: 'dmb_get_note',
                    note_id: noteId,
                    nonce: dmb_ajax.nonce
                },
                success: function(response) {
                    if (response.success) {
                        DMB.displayEditForm(response.data);
                    } else {
                        alert(response.data.message);
                    }
                },
                error: function() {
                    alert('Error loading note for editing.');
                }
            });
        },
        
        displayEditForm: function(note) {
            var html = '<div class="dmb-edit-note-content">';
            html += '<button class="button dmb-back-to-list">← Back to All Notes</button>';
            html += '<h3>Edit Note</h3>';
            html += '<form id="dmb-edit-form" data-note-id="' + note.id + '">';
            
            html += '<div class="dmb-form-group">';
            html += '<label for="dmb-edit-title">Title:</label>';
            html += '<input type="text" id="dmb-edit-title" name="title" value="' + DMB.escapeHtml(note.title) + '" required>';
            html += '</div>';
            
            html += '<div class="dmb-form-group">';
            html += '<label for="dmb-edit-content">Content:</label>';
            html += '<div id="dmb-edit-content-container"></div>';
            html += '</div>';
            
            html += '<div class="dmb-form-group">';
            html += '<label>Who can see this note?</label>';
            html += '<div class="dmb-visibility-options">';
            html += '<label><input type="radio" name="visibility" value="admins"' + (note.visibility !== 'specific' ? ' checked' : '') + '> All Administrators</label>';
            html += '<label><input type="radio" name="visibility" value="specific"' + (note.visibility === 'specific' ? ' checked' : '') + '> Specific Users (+ All Administrators)</label>';
            html += '</div>';
            
            html += '<div id="dmb-edit-user-selection"' + (note.visibility !== 'specific' ? ' style="display: none;"' : '') + '>';
            html += '<label for="dmb-edit-selected-users">Select Users:</label>';
            html += '<select id="dmb-edit-selected-users" name="selected_users[]" multiple>';
            // We'll populate this with AJAX after the form is displayed
            html += '</select>';
            html += '</div>';
            html += '</div>';
            
            html += '<div class="dmb-form-actions">';
            html += '<button type="submit" class="button button-primary">Update Note</button>';
            html += '<button type="button" class="button dmb-back-to-list">Cancel</button>';
            html += '</div>';
            
            html += '</form>';
            html += '</div>';
            
            $('#dmb-single-note').html(html);
            DMB.showView('dmb-single-note');
            
            // Initialize the editor for editing
            setTimeout(function() {
                DMB.initEditEditor(note);
                DMB.populateUserSelect(note);
                DMB.bindEditEvents();
            }, 100);
        },
        
        initEditEditor: function(note) {
            var editorId = 'dmb-edit-content';
            var container = $('#dmb-edit-content-container');
            
            // Create textarea with proper styling
            container.html('<textarea id="' + editorId + '" name="content" style="color: #333; background: #fff; visibility: visible; opacity: 1; display: block;">' + DMB.escapeHtml(note.content) + '</textarea>');
            
            // Check if wp.editor is available and editor isn't already initialized
            if (window.wp && window.wp.editor) {
                // Check if editor wrapper already exists to prevent duplicates
                var existingWrap = $('#wp-' + editorId + '-wrap');
                if (existingWrap.length && existingWrap.hasClass('wp-editor-wrap')) {
                    // Editor already exists, just ensure Visual tab is active
                    setTimeout(function() {
                        DMB.ensureVisualTabDefault();
                        DMB.forceTextVisibility();
                    }, 100);
                    return;
                }

                var editorSettings = {
                    tinymce: {
                        toolbar1: 'bold,italic,underline,strikethrough,bullist,numlist,blockquote,link,unlink,undo,redo',
                        toolbar2: '',
                    },
                    quicktags: true,
                    mediaButtons: false,
                    default_editor: 'tinymce' // Force Visual tab as default
                };
                
                wp.editor.initialize(editorId, editorSettings);
                
                // Ensure Visual tab is active and text is visible after initialization
                setTimeout(function() {
                    DMB.ensureVisualTabDefault();
                    DMB.forceTextVisibility();
                    
                    // Additional specific check for edit editor
                    var $editWrap = $('#wp-' + editorId + '-wrap');
                    if ($editWrap.length) {
                        $editWrap.removeClass('html-active').addClass('tmce-active');
                        $editWrap.find('.switch-tmce').addClass('switch-editor-active');
                        $editWrap.find('.switch-html').removeClass('switch-editor-active');
                        
                        // Ensure the textarea is visible
                        $editWrap.find('.wp-editor-area').css({
                            'color': '#333',
                            'background-color': '#fff',
                            'visibility': 'visible',
                            'opacity': '1',
                            'display': 'block'
                        });
                    }
                }, 300);
            } else {
                // If wp.editor is not available, just ensure proper styling
                setTimeout(function() {
                    DMB.ensureVisualTabDefault();
                    DMB.forceTextVisibility();
                }, 100);
            }
        },
        
        populateUserSelect: function(note) {
            // Get users list via AJAX and populate the select
            $.ajax({
                url: dmb_ajax.ajax_url,
                type: 'POST',
                data: {
                    action: 'dmb_get_users', // You'll need to add this AJAX handler
                    nonce: dmb_ajax.nonce
                },
                success: function(response) {
                    if (response.success) {
                        var options = '';
                        $.each(response.data, function(index, user) {
                            var selected = note.visible_to.indexOf(user.display_name) !== -1 ? ' selected' : '';
                            options += '<option value="' + user.ID + '"' + selected + '>' + 
                                      DMB.escapeHtml(user.display_name + ' (' + user.user_email + ')') + '</option>';
                        });
                        $('#dmb-edit-selected-users').html(options);
                    }
                },
                error: function() {
                    console.log('Error loading users');
                }
            });
        },
        
        bindEditEvents: function() {
            // Bind visibility toggle for edit form
            $('#dmb-edit-form input[name="visibility"]').on('change', function() {
                if ($(this).val() === 'specific') {
                    $('#dmb-edit-user-selection').slideDown();
                } else {
                    $('#dmb-edit-user-selection').slideUp();
                }
            });
        },
        
        handleCreateNote: function(e) {
            e.preventDefault();
            
            // Get content from editor using improved method
            var content = DMB.getEditorContent('dmb-note-content');
            
            var formData = {
                action: 'dmb_create_note',
                nonce: dmb_ajax.nonce,
                title: $('#dmb-note-title').val(),
                content: content,
                visibility: $('input[name="visibility"]:checked').val(),
                selected_users: $('#dmb-selected-users').val() || []
            };
            
            $.ajax({
                url: dmb_ajax.ajax_url,
                type: 'POST',
                data: formData,
                success: function(response) {
                    if (response.success) {
                        alert(response.data.message);
                        // Reset form
                        $('#dmb-create-form')[0].reset();
                        $('#dmb-user-selection').hide();
                        
                        // Clear editor content
                        if (typeof tinyMCE !== 'undefined' && tinyMCE.get('dmb-note-content')) {
                            tinyMCE.get('dmb-note-content').setContent('');
                        }
                        $('#dmb-note-content').val('');
                        
                        // Refresh recent notes if available
                        DMB.refreshRecentNotes();
                        
                        // Ensure Visual tab is selected for next note
                        setTimeout(function() {
                            DMB.ensureVisualTabDefault();
                        }, 100);
                    } else {
                        alert('Error: ' + response.data.message);
                    }
                },
                error: function(xhr, status, error) {
                    console.error('AJAX Error:', status, error);
                    alert('Error creating note. Please check the console for details.');
                }
            });
        },
        
        handleUpdateNote: function(e) {
            e.preventDefault();
            
            var noteId = $(this).data('note-id');
            
            // Get content from editor using improved method
            var content = DMB.getEditorContent('dmb-edit-content');
            
            var formData = {
                action: 'dmb_update_note',
                note_id: noteId,
                nonce: dmb_ajax.nonce,
                title: $('#dmb-edit-title').val(),
                content: content,
                visibility: $('#dmb-edit-form input[name="visibility"]:checked').val(),
                selected_users: $('#dmb-edit-selected-users').val() || []
            };
            
            $.ajax({
                url: dmb_ajax.ajax_url,
                type: 'POST',
                data: formData,
                success: function(response) {
                    if (response.success) {
                        alert(response.data.message);
                        // Remove TinyMCE editor
                        if (typeof tinyMCE !== 'undefined' && tinyMCE.get('dmb-edit-content')) {
                            tinyMCE.remove('#dmb-edit-content');
                        }
                        // Check if we're on the admin page
                        if (window.location.href.indexOf('page=dashboard-message-board-new') > -1) {
                            // Redirect back to the notes list
                            window.location.href = dmb_ajax.admin_url + 'admin.php?page=dashboard-message-board';
                        } else {
                            // Regular widget behavior
                            DMB.viewNote.call($('<div data-note-id="' + noteId + '"></div>')[0], { preventDefault: function() {} });
                        }
                    } else {
                        alert('Error: ' + response.data.message);
                    }
                },
                error: function(xhr, status, error) {
                    console.error('AJAX Error:', status, error);
                    alert('Error updating note. Please check the console for details.');
                }
            });
        },
        
        deleteNote: function(e) {
            e.preventDefault();
            
            if (!confirm('Are you sure you want to delete this note? This action cannot be undone.')) {
                return;
            }
            
            var noteId = $(this).data('note-id');
            
            $.ajax({
                url: dmb_ajax.ajax_url,
                type: 'POST',
                data: {
                    action: 'dmb_delete_note',
                    note_id: noteId,
                    nonce: dmb_ajax.nonce
                },
                success: function(response) {
                    if (response.success) {
                        alert(response.data.message);
                        // Check if we're on the dashboard widget
                        if ($('#dashboard-widgets').length) {
                            // Reload to refresh the recent notes
                            window.location.reload();
                        } else {
                            DMB.showAllNotes({ preventDefault: function() {} });
                        }
                    } else {
                        alert(response.data.message);
                    }
                },
                error: function() {
                    alert('Error deleting note.');
                }
            });
        },
        
        refreshRecentNotes: function() {
            if ($('.dmb-recent-notes').length) {
                $.ajax({
                    url: dmb_ajax.ajax_url,
                    type: 'POST',
                    data: {
                        action: 'dmb_get_recent_notes',
                        nonce: dmb_ajax.nonce
                    },
                    success: function(response) {
                        if (response.success) {
                            $('.dmb-recent-notes ul, .dmb-recent-notes p').remove();
                            $('.dmb-recent-notes').append(response.data.html);
                        }
                    }
                });
            }
        },
        
        quickViewNote: function(e) {
            e.preventDefault();
            var noteId = $(this).data('note-id');
            DMB.showView('dmb-single-note');
            DMB.viewNote.call(this, e);
        },
        
        adminViewNoteFromTitle: function(e) {
            e.preventDefault();
            e.stopPropagation();
            var noteId = $(this).data('note-id');
            window.location.href = dmb_ajax.admin_url + 'admin.php?page=dashboard-message-board-new&view=' + noteId;
        },
        
        adminViewNote: function(e) {
            e.preventDefault();
            e.stopPropagation();
            var noteId = $(this).data('note-id');
            
            // For admin page, redirect to the widget interface to view the note
            window.location.href = dmb_ajax.admin_url + 'admin.php?page=dashboard-message-board-new&view=' + noteId;
        },
        
        adminEditNote: function(e) {
            e.preventDefault();
            e.stopPropagation();
            var noteId = $(this).data('note-id');
            
            // Redirect to edit page
            window.location.href = dmb_ajax.admin_url + 'admin.php?page=dashboard-message-board-new&edit=' + noteId;
        },
        
        adminDeleteNote: function(e) {
            e.preventDefault();
            e.stopPropagation();
            
            if (!confirm('Are you sure you want to delete this note? This action cannot be undone.')) {
                return;
            }
            
            var noteId = $(this).data('note-id');
            var $row = $(this).closest('tr');
            
            $.ajax({
                url: dmb_ajax.ajax_url,
                type: 'POST',
                data: {
                    action: 'dmb_delete_note',
                    note_id: noteId,
                    nonce: dmb_ajax.nonce
                },
                success: function(response) {
                    if (response.success) {
                        // Remove the row with animation
                        $row.fadeOut(400, function() {
                            $(this).remove();
                            // Check if no more notes
                            if ($('.wp-list-table tbody tr').length === 0) {
                                $('.wp-list-table tbody').html('<tr><td colspan="4">No notes found.</td></tr>');
                            }
                        });
                    } else {
                        alert(response.data.message);
                    }
                },
                error: function() {
                    alert('Error deleting note.');
                }
            });
        },
        
        setupWPEditor: function() {
            var editorId = 'dmb-note-content';
            var textarea = document.getElementById(editorId);

            if (window.wp && window.wp.editor && textarea) {
                // Check if editor is already initialized to prevent duplicates
                var existingWrap = $('#wp-' + editorId + '-wrap');
                if (existingWrap.length && existingWrap.hasClass('wp-editor-wrap')) {
                    // Editor already exists, just ensure Visual tab is active
                    setTimeout(function() {
                        DMB.ensureVisualTabDefault();
                        DMB.forceTextVisibility();
                    }, 100);
                    return;
                }

                var editorSettings = {
                    tinymce: {
                        toolbar1: 'bold,italic,underline,strikethrough,bullist,numlist,blockquote,link,unlink,undo,redo',
                        toolbar2: '',
                    },
                    quicktags: true,
                    mediaButtons: false,
                    default_editor: 'tinymce' // Force Visual tab as default
                };

                wp.editor.initialize(editorId, editorSettings);
                
                // Ensure Visual tab is active and text is visible after initialization
                setTimeout(function() {
                    DMB.ensureVisualTabDefault();
                    DMB.forceTextVisibility();
                }, 200);
                
                // Additional timeout for stubborn cases
                setTimeout(function() {
                    DMB.forceTextVisibility();
                }, 500);
            } else {
                // If wp.editor is not available, just ensure existing editor is properly styled
                setTimeout(function() {
                    DMB.ensureVisualTabDefault();
                    DMB.forceTextVisibility();
                }, 100);
            }
        },

        escapeHtml: function(text) {
            var map = {
                '&': '&amp;',
                '<': '&lt;',
                '>': '&gt;',
                '"': '&quot;',
                "'": '&#039;'
            };
            
            return text.replace(/[&<>"']/g, function(m) { return map[m]; });
        }
    };
    
    $(document).ready(function() {
        // Only initialize if we're on a page with the message board
        if ($('#dmb-widget-container').length || $('#dmb-admin-container').length) {
            DMB.init();
        }
    });
    
})(jQuery);
