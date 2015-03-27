/*
 * (C) Copyright 2015 Nuxeo SA (http://nuxeo.com/) and contributors.
 *
 * All rights reserved. This program and the accompanying materials
 * are made available under the terms of the GNU Lesser General Public License
 * (LGPL) version 2.1 which accompanies this distribution, and is available at
 * http://www.gnu.org/licenses/lgpl-2.1.html
 *
 * This library is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the GNU
 * Lesser General Public License for more details.
 *
 * Contributors:
 *      Nelson Silva <nsilva@nuxeo.com>
 */

package org.nuxeo.ecm.platform.webcomponents.metadata;

import org.apache.commons.lang.StringUtils;

import java.util.HashMap;
import java.util.Map;

/**
 * Metadata for our element's properties.
 *
 * @since 7.3
 */
public class PropertyMetadata {

    String name;

    String kind;

    Map<String, String> attributes;

    private PropertyMetadata(String name, String kind) {
        this(name, kind, new HashMap<>());
    }

    private PropertyMetadata(String name, String kind, Map<String, String> attributes) {
        this.name = name;
        this.kind = kind;
        this.attributes = attributes;
    }

    // Helper Factories
    public static PropertyMetadata string(String name) {
        return new PropertyMetadata(name, "string");
    }

    public static PropertyMetadata text(String name) {
        return new PropertyMetadata(name, "text");
    }

    public static PropertyMetadata number(String name) {
        return new PropertyMetadata(name, "number");
    }

    public static PropertyMetadata color(String name) {
        return new PropertyMetadata(name, "number");
    }

    public static PropertyMetadata bool(String name) {
        return new PropertyMetadata(name, "boolean");
    }

    public static PropertyMetadata select(String name, String[] options) {
        Map<String, String> attributes = new HashMap<>();
        attributes.put("options", StringUtils.join(options, ","));
        return new PropertyMetadata(name, "select", attributes);
    }

    public static PropertyMetadata json(String name) {
        return new PropertyMetadata(name, "json");
    }

    public static PropertyMetadata range(String name, int max, int min, int step, int defaultValue) {
        Map<String, String> attributes = new HashMap<>();
        attributes.put("max", Integer.toString(max));
        attributes.put("min", Integer.toString(min));
        attributes.put("step", Integer.toString(step));
        attributes.put("defaultValue", Integer.toString(defaultValue));
        return new PropertyMetadata(name, "range", attributes);
    }

    public String getName() {
        return name;
    }

    public String getKind() {
        return kind;
    }

    public Map<String, String> getAttributes() {
        return attributes;
    }
}
