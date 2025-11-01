<?php
/**
 * Plugin Name: Message Board
 * Description: A message board widget for the WordPress dashboard where users can create and share notes
 * Version: 1.0.2
 * Author: Web Pro Geeks
 * Author URI: https://webprogeeks.com/
 * License: GPL v2 or later
 */

// Prevent direct access
if (!defined('ABSPATH')) {
    exit;
}

// Define plugin constants
define('DMB_PLUGIN_URL', plugin_dir_url(__FILE__));
define('DMB_PLUGIN_PATH', plugin_dir_path(__FILE__));

// Main plugin class
class DashboardMessageBoard {
    
    private static $instance = null;
    
    public static function get_instance() {
        if (null === self::$instance) {
            self::$instance = new self();
        }
        return self::$instance;
    }
    
    private function __construct() {
        $this->init();
    }
    
    private function init() {
        // Register custom post type
        add_action('init', array($this, 'register_note_post_type'));
        
        // Add dashboard widget
        add_action('wp_dashboard_setup', array($this, 'add_dashboard_widget'));
        
        // Add admin menu
        //add_action('admin_menu', array($this, 'add_admin_menu'));
        
        // Enqueue scripts and styles
        add_action('admin_enqueue_scripts', array($this, 'enqueue_admin_assets'));
        
        // AJAX handlers
        add_action('wp_ajax_dmb_create_note', array($this, 'ajax_create_note'));
        add_action('wp_ajax_dmb_get_notes', array($this, 'ajax_get_notes'));
        add_action('wp_ajax_dmb_get_note', array($this, 'ajax_get_note'));
        add_action('wp_ajax_dmb_update_note', array($this, 'ajax_update_note'));
        add_action('wp_ajax_dmb_delete_note', array($this, 'ajax_delete_note'));
        add_action('wp_ajax_dmb_get_recent_notes', array($this, 'ajax_get_recent_notes'));
        
        // Add custom meta box for visibility settings
        add_action('add_meta_boxes', array($this, 'add_visibility_meta_box'));
        add_action('save_post_dmb_note', array($this, 'save_visibility_meta'));
    }
    
    public function register_note_post_type() {
        $args = array(
            'public' => false,
            'publicly_queryable' => false,
            'show_ui' => false,
            'show_in_menu' => false,
            'query_var' => false,
            'capability_type' => 'post',
            'has_archive' => false,
            'hierarchical' => false,
            'supports' => array('title', 'editor', 'author'),
            'labels' => array(
                'name' => 'Dashboard Notes',
                'singular_name' => 'Dashboard Note'
            )
        );
        
        register_post_type('dmb_note', $args);
    }
    
    public function add_dashboard_widget() {
        wp_add_dashboard_widget(
            'dmb_message_board',
            'Message Board',
            array($this, 'render_dashboard_widget')
        );
    }
    
//     public function add_admin_menu() {
//         add_menu_page(
//             'Message Board',
//             'Message Board',
//             'read',
//             'dashboard-message-board',
//             array($this, 'render_admin_page'),
//             'dashicons-format-status',
//             30
//         );
        
//         add_submenu_page(
//             'dashboard-message-board',
//             'All Notes',
//             'All Notes',
//             'read',
//             'dashboard-message-board',
//             array($this, 'render_admin_page')
//         );
        
//         add_submenu_page(
//             'dashboard-message-board',
//             'Add New Note',
//             'Add New',
//             'read',
//             'dashboard-message-board-new',
//             array($this, 'render_new_note_page')
//         );
//     }
    
    public function render_admin_page() {
        $current_user_id = get_current_user_id();
        $is_admin = current_user_can('administrator');
        
        ?>
        <div class="wrap">
            <h1 class="wp-heading-inline">Message Board</h1>
            <a href="<?php echo admin_url('admin.php?page=dashboard-message-board-new'); ?>" class="page-title-action">Add New</a>
            <hr class="wp-header-end">
            
            <?php
            // Get all notes
            $args = array(
                'post_type' => 'dmb_note',
                'posts_per_page' => -1,
                'orderby' => 'date',
                'order' => 'DESC'
            );
            
            $notes = get_posts($args);
            ?>
            
            <table class="wp-list-table widefat fixed striped posts">
                <thead>
                    <tr>
                        <th scope="col" class="manage-column column-title column-primary">Title</th>
                        <th scope="col" class="manage-column column-author">Author</th>
                        <th scope="col" class="manage-column column-visibility">Visibility</th>
                        <th scope="col" class="manage-column column-date">Date</th>
                    </tr>
                </thead>
                <tbody>
                    <?php
                    if (empty($notes)) {
                        echo '<tr><td colspan="4">No notes found.</td></tr>';
                    } else {
                        foreach ($notes as $note) {
                            if ($this->user_can_view_note($note->ID, $current_user_id, $is_admin)) {
                                $visibility = get_post_meta($note->ID, '_dmb_visibility', true);
                                $can_edit = $note->post_author == $current_user_id;
                                ?>
                                <tr>
                                    <td class="title column-title column-primary">
                                        <strong>
                                            <span class="dmb-note-title" data-note-id="<?php echo $note->ID; ?>">
                                                <?php echo esc_html($note->post_title); ?>
                                            </span>
                                        </strong>
                                        <div class="row-actions">
                                            <span class="view">
                                                <a href="#" class="dmb-admin-view-note" data-note-id="<?php echo $note->ID; ?>">View</a>
                                            </span>
                                            <?php if ($can_edit): ?>
                                                | <span class="edit">
                                                    <a href="#" class="dmb-admin-edit-note" data-note-id="<?php echo $note->ID; ?>">Edit</a>
                                                </span>
                                                | <span class="trash">
                                                    <a href="#" class="dmb-admin-delete-note" data-note-id="<?php echo $note->ID; ?>" style="color: #a00;">Delete</a>
                                                </span>
                                            <?php endif; ?>
                                        </div>
                                    </td>
                                    <td class="author column-author">
                                        <?php echo esc_html(get_the_author_meta('display_name', $note->post_author)); ?>
                                    </td>
                                    <td class="visibility column-visibility">
                                        <?php echo $visibility === 'specific' ? 'Specific Users' : 'All Admins'; ?>
                                    </td>
                                    <td class="date column-date">
                                        <?php echo get_the_date('Y/m/d', $note); ?>
                                    </td>
                                </tr>
                                <?php
                            }
                        }
                    }
                    ?>
                </tbody>
            </table>
        </div>
        
        <!-- Modal for viewing/editing notes -->
        <div id="dmb-admin-modal" style="display: none;">
            <div id="dmb-admin-modal-content"></div>
        </div>
        <?php
    }
    
    public function render_new_note_page() {
        ?>
        <div class="wrap">
            <?php
            // Check if we're viewing or editing a specific note
            $view_id = isset($_GET['view']) ? intval($_GET['view']) : 0;
            $edit_id = isset($_GET['edit']) ? intval($_GET['edit']) : 0;
            
            if ($view_id || $edit_id) {
                echo '<h1><a href="' . admin_url('admin.php?page=dashboard-message-board') . '">← Back to Message Board</a></h1>';
            } else {
                echo '<h1>Add New Note</h1>';
            }
            ?>
            <div id="dmb-admin-container">
                <?php $this->render_message_board_interface(); ?>
            </div>
            
            <?php if ($view_id || $edit_id): ?>
            <script type="text/javascript">
            jQuery(document).ready(function($) {
                setTimeout(function() {
                    <?php if ($view_id): ?>
                    // Trigger view
                    var noteId = <?php echo $view_id; ?>;
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
                            }
                        }
                    });
                    <?php elseif ($edit_id): ?>
                    // Trigger edit
                    var noteId = <?php echo $edit_id; ?>;
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
                                DMB.showView('dmb-single-note');
                            }
                        }
                    });
                    <?php endif; ?>
                }, 500);
            });
            </script>
            <?php endif; ?>
        </div>
        <?php
    }
    
    public function render_dashboard_widget() {
        ?>
        <div id="dmb-widget-container">
            <?php $this->render_message_board_interface(); ?>
            
            <!-- Recent Notes Section -->
            <div class="dmb-recent-notes">
                <h4 style="margin-top: 20px; padding-top: 20px; border-top: 1px solid #eee;">Recent Notes</h4>
                <?php
                $current_user_id = get_current_user_id();
                $is_admin = current_user_can('administrator');
                
                $args = array(
                    'post_type' => 'dmb_note',
                    'posts_per_page' => 5,
                    'orderby' => 'date',
                    'order' => 'DESC'
                );
                
                $recent_notes = get_posts($args);
                
                if (empty($recent_notes)) {
                    echo '<p style="color: #666;">No notes yet. Create your first note!</p>';
                } else {
                    echo '<ul style="margin: 0;">';
                    foreach ($recent_notes as $note) {
                        if ($this->user_can_view_note($note->ID, $current_user_id, $is_admin)) {
                            echo '<li style="margin-bottom: 8px;">';
                            echo '<a href="#" class="dmb-quick-view-note" data-note-id="' . $note->ID . '" style="text-decoration: none;">';
                            echo esc_html($note->post_title);
                            echo '</a>';
                            echo '<span style="color: #666; font-size: 12px;"> - ' . get_the_date('M j', $note) . '</span>';
                            echo '</li>';
                        }
                    }
                    echo '</ul>';
                }
                ?>
            </div>
        </div>
        <?php
    }
    
    private function render_message_board_interface() {
        ?>
        <div id="dmb-create-note" class="dmb-view active">
            <h4>Create New Note</h4>
            <form id="dmb-create-form">
                <div class="dmb-form-group">
                    <label for="dmb-note-title">Title:</label>
                    <input type="text" id="dmb-note-title" name="title" required>
                </div>
                
                <div class="dmb-form-group">
                    <label for="dmb-note-content">Content:</label>
                    <?php
                    $editor_id = 'dmb-note-content';
                    $settings = array(
                        'media_buttons' => false,
                        'textarea_name' => 'content',
                        'textarea_rows' => 8,
                        'quicktags' => true,
						'tinymce' => false,
//                         'tinymce' => array(
//                             'toolbar1' => 'bold,italic,underline,strikethrough,bullist,numlist,blockquote,link,unlink,undo,redo',
//                             'toolbar2' => '',
//                         ),
                        'default_editor' => 'tinymce', // Force Visual tab as default
                        'wpautop' => true,
                        'teeny' => false,
                    );
                    wp_editor('', $editor_id, $settings);
                    ?>
                </div>
                
                <div class="dmb-form-group">
                    <label>Who can see this note?</label>
                    <div class="dmb-visibility-options">
                        <label>
                            <input type="radio" name="visibility" value="admins" checked>
                            All Administrators
                        </label>
                        <label>
                            <input type="radio" name="visibility" value="specific">
                            Specific Users (+ All Administrators)
                        </label>
                    </div>
                    
                    <div id="dmb-user-selection" style="display: none;">
                        <label for="dmb-selected-users">Select Users:</label>
                        <select id="dmb-selected-users" name="selected_users[]" multiple>
                            <?php
                            $users = get_users();
                            foreach ($users as $user) {
                                echo '<option value="' . esc_attr($user->ID) . '">' . 
                                     esc_html($user->display_name . ' (' . $user->user_email . ')') . 
                                     '</option>';
                            }
                            ?>
                        </select>
                    </div>
                </div>
                
                <div class="dmb-form-actions">
                    <button type="submit" class="button button-primary">Save Note</button>
                    <button type="button" class="button dmb-view-all">View All Notes</button>
                </div>
            </form>
        </div>
        
        <div id="dmb-notes-list" class="dmb-view">
            <div class="dmb-header">
                <h4>All Notes</h4>
                <button class="button dmb-create-new">Create New Note</button>
            </div>
            <div id="dmb-notes-container">
                <!-- Notes will be loaded here -->
            </div>
        </div>
        
        <div id="dmb-single-note" class="dmb-view">
            <!-- Single note view will be loaded here -->
        </div>
        <?php
    }
    
    public function enqueue_admin_assets($hook) {
        // Load on dashboard and our admin pages
        if ('index.php' !== $hook && 
            'toplevel_page_dashboard-message-board' !== $hook && 
            'message-board_page_dashboard-message-board-new' !== $hook) {
            return;
        }
        
        // Enqueue WordPress media scripts for TinyMCE
        wp_enqueue_editor();
        
        wp_enqueue_script(
            'dmb-admin-script',
            DMB_PLUGIN_URL . 'assets/admin.js',
            array('jquery'),
            '1.0.1',
            true
        );
        
        wp_enqueue_style(
            'dmb-admin-style',
            DMB_PLUGIN_URL . 'assets/admin.css',
            array(),
            '1.0.1'
        );
        
        wp_localize_script('dmb-admin-script', 'dmb_ajax', array(
            'ajax_url' => admin_url('admin-ajax.php'),
            'nonce' => wp_create_nonce('dmb_nonce'),
            'current_user_id' => get_current_user_id(),
            'admin_url' => admin_url()
        ));
    }
    
    public function ajax_create_note() {
        // Verify nonce
        if (!check_ajax_referer('dmb_nonce', 'nonce', false)) {
            wp_send_json_error(array('message' => 'Security check failed'));
            return;
        }
        
        // Check user permissions
        if (!current_user_can('read')) {
            wp_send_json_error(array('message' => 'You do not have permission to create notes'));
            return;
        }
        
        $title = sanitize_text_field($_POST['title']);
        $content = wp_kses_post($_POST['content']); // Allow more HTML tags
        $visibility = sanitize_text_field($_POST['visibility']);
        $selected_users = isset($_POST['selected_users']) ? array_map('intval', $_POST['selected_users']) : array();
        
        // Validate required fields
        if (empty($title) || empty($content)) {
            wp_send_json_error(array('message' => 'Title and content are required'));
            return;
        }
        
        $post_data = array(
            'post_title' => $title,
            'post_content' => $content,
            'post_status' => 'publish',
            'post_type' => 'dmb_note',
            'post_author' => get_current_user_id()
        );
        
        $post_id = wp_insert_post($post_data);
        
        if (!is_wp_error($post_id)) {
            update_post_meta($post_id, '_dmb_visibility', $visibility);
            if ($visibility === 'specific' && !empty($selected_users)) {
                update_post_meta($post_id, '_dmb_selected_users', $selected_users);
                
                // Send notification emails
                $this->send_notification_emails($post_id, $selected_users);
            }
            
            wp_send_json_success(array('message' => 'Note created successfully', 'note_id' => $post_id));
        } else {
            wp_send_json_error(array('message' => 'Failed to create note: ' . $post_id->get_error_message()));
        }
    }
    
    public function ajax_get_notes() {
        check_ajax_referer('dmb_nonce', 'nonce');
        
        $current_user_id = get_current_user_id();
        $is_admin = current_user_can('administrator');
        
        $args = array(
            'post_type' => 'dmb_note',
            'posts_per_page' => -1,
            'orderby' => 'date',
            'order' => 'DESC'
        );
        
        $posts = get_posts($args);
        $notes = array();
        
        foreach ($posts as $post) {
            if ($this->user_can_view_note($post->ID, $current_user_id, $is_admin)) {
                $excerpt = wp_trim_words(strip_tags($post->post_content), 30, '...');
                $notes[] = array(
                    'id' => $post->ID,
                    'title' => $post->post_title,
                    'excerpt' => $excerpt,
                    'date' => get_the_date('M j, Y', $post),
                    'author' => get_the_author_meta('display_name', $post->post_author)
                );
            }
        }
        
        wp_send_json_success($notes);
    }
    
    public function ajax_get_note() {
        check_ajax_referer('dmb_nonce', 'nonce');
        
        $note_id = intval($_POST['note_id']);
        $note = get_post($note_id);
        $current_user_id = get_current_user_id();
        $is_admin = current_user_can('administrator');
        
        if (!$note || $note->post_type !== 'dmb_note') {
            wp_send_json_error(array('message' => 'Invalid note'));
            return;
        }
        
        if (!$this->user_can_view_note($note_id, $current_user_id, $is_admin)) {
            wp_send_json_error(array('message' => 'You do not have permission to view this note'));
            return;
        }
        
        $visibility = get_post_meta($note_id, '_dmb_visibility', true);
        $selected_users = get_post_meta($note_id, '_dmb_selected_users', true);
        $visible_to = array();
        
        if ($visibility === 'specific' && !empty($selected_users)) {
            foreach ($selected_users as $user_id) {
                $user = get_user_by('id', $user_id);
                if ($user) {
                    $visible_to[] = $user->display_name;
                }
            }
        }
        
        $note_data = array(
            'id' => $note->ID,
            'title' => $note->post_title,
            'content' => $note->post_content,
            'date' => get_the_date('M j, Y', $note),
            'author' => get_the_author_meta('display_name', $note->post_author),
            'visibility' => $visibility,
            'visible_to' => $visible_to,
            'can_edit' => $note->post_author == $current_user_id
        );
        
        wp_send_json_success($note_data);
    }
    
    public function ajax_update_note() {
        // Verify nonce
        if (!check_ajax_referer('dmb_nonce', 'nonce', false)) {
            wp_send_json_error(array('message' => 'Security check failed'));
            return;
        }
        
        $note_id = intval($_POST['note_id']);
        $note = get_post($note_id);
        
        if (!$note || $note->post_type !== 'dmb_note') {
            wp_send_json_error(array('message' => 'Invalid note'));
            return;
        }
        
        if ($note->post_author != get_current_user_id()) {
            wp_send_json_error(array('message' => 'You do not have permission to edit this note'));
            return;
        }
        
        $title = sanitize_text_field($_POST['title']);
        $content = wp_kses_post($_POST['content']); // Allow more HTML tags
        $visibility = sanitize_text_field($_POST['visibility']);
        $selected_users = isset($_POST['selected_users']) ? array_map('intval', $_POST['selected_users']) : array();
        
        // Validate required fields
        if (empty($title) || empty($content)) {
            wp_send_json_error(array('message' => 'Title and content are required'));
            return;
        }
        
        $post_data = array(
            'ID' => $note_id,
            'post_title' => $title,
            'post_content' => $content
        );
        
        $result = wp_update_post($post_data);
        
        if (!is_wp_error($result)) {
            update_post_meta($note_id, '_dmb_visibility', $visibility);
            if ($visibility === 'specific' && !empty($selected_users)) {
                $old_users = get_post_meta($note_id, '_dmb_selected_users', true);
                update_post_meta($note_id, '_dmb_selected_users', $selected_users);
                
                // Send notifications to newly added users
                $new_users = array_diff($selected_users, (array)$old_users);
                if (!empty($new_users)) {
                    $this->send_notification_emails($note_id, $new_users);
                }
            } else {
                delete_post_meta($note_id, '_dmb_selected_users');
            }
            
            wp_send_json_success(array('message' => 'Note updated successfully'));
        } else {
            wp_send_json_error(array('message' => 'Failed to update note: ' . $result->get_error_message()));
        }
    }
    
    public function ajax_delete_note() {
        check_ajax_referer('dmb_nonce', 'nonce');
        
        $note_id = intval($_POST['note_id']);
        $note = get_post($note_id);
        
        if ($note->post_author != get_current_user_id()) {
            wp_send_json_error(array('message' => 'You do not have permission to delete this note'));
        }
        
        if (wp_delete_post($note_id, true)) {
            wp_send_json_success(array('message' => 'Note deleted successfully'));
        } else {
            wp_send_json_error(array('message' => 'Failed to delete note'));
        }
    }
    
    public function ajax_get_recent_notes() {
        check_ajax_referer('dmb_nonce', 'nonce');
        
        $current_user_id = get_current_user_id();
        $is_admin = current_user_can('administrator');
        
        $args = array(
            'post_type' => 'dmb_note',
            'posts_per_page' => 5,
            'orderby' => 'date',
            'order' => 'DESC'
        );
        
        $recent_notes = get_posts($args);
        $html = '';
        
        if (empty($recent_notes)) {
            $html = '<p style="color: #666;">No notes yet. Create your first note!</p>';
        } else {
            $html = '<ul style="margin: 0;">';
            foreach ($recent_notes as $note) {
                if ($this->user_can_view_note($note->ID, $current_user_id, $is_admin)) {
                    $html .= '<li style="margin-bottom: 8px;">';
                    $html .= '<a href="#" class="dmb-quick-view-note" data-note-id="' . $note->ID . '" style="text-decoration: none;">';
                    $html .= esc_html($note->post_title);
                    $html .= '</a>';
                    $html .= '<span style="color: #666; font-size: 12px;"> - ' . get_the_date('M j', $note) . '</span>';
                    $html .= '</li>';
                }
            }
            $html .= '</ul>';
        }
        
        wp_send_json_success(array('html' => $html));
    }
    
    private function user_can_view_note($note_id, $user_id, $is_admin) {
        $note = get_post($note_id);
        
        if (!$note || $note->post_type !== 'dmb_note') {
            return false;
        }
        
        // Author can always see their own notes
        if ($note->post_author == $user_id) {
            return true;
        }
        
        // Admins can see all notes
        if ($is_admin) {
            return true;
        }
        
        // Check visibility settings
        $visibility = get_post_meta($note_id, '_dmb_visibility', true);
        if ($visibility === 'specific') {
            $selected_users = get_post_meta($note_id, '_dmb_selected_users', true);
            if (is_array($selected_users) && in_array($user_id, $selected_users)) {
                return true;
            }
        }
        
        return false;
    }
    
    private function send_notification_emails($note_id, $user_ids) {
        $note = get_post($note_id);
        $author = get_user_by('id', $note->post_author);
        
        foreach ($user_ids as $user_id) {
            $user = get_user_by('id', $user_id);
            if (!$user) continue;
            
            $subject = sprintf('[%s] New message board note shared with you', get_bloginfo('name'));
            
            $message = sprintf(
                "Hello %s,\n\n%s has shared a new note with you on the dashboard message board.\n\nTitle: %s\n\nYou can view this note by logging into the WordPress dashboard.\n\nBest regards,\n%s",
                $user->display_name,
                $author->display_name,
                $note->post_title,
                get_bloginfo('name')
            );
            
            wp_mail($user->user_email, $subject, $message);
        }
    }
    
    public function add_visibility_meta_box() {
        // This is just a placeholder since we're not using the standard post editor
    }
    
    public function save_visibility_meta($post_id) {
        // This is just a placeholder since we're not using the standard post editor
    }
}

// Initialize the plugin
add_action('plugins_loaded', array('DashboardMessageBoard', 'get_instance'));

// Activation hook
register_activation_hook(__FILE__, function() {
    DashboardMessageBoard::get_instance()->register_note_post_type();
    flush_rewrite_rules();
});

// Deactivation hook
register_deactivation_hook(__FILE__, function() {
    flush_rewrite_rules();
});
